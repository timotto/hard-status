/**
 * The "async_fs" sketch file is a workaround for problems encountered while accessing SPIFFS from the
 * second core. It may be related to specifics of the ESP32-Arduino FreeRTOS implementation, some missing or
 * wrong initialization parameters or function calls.
 */
#include "common.h"

#define ASYNCFS_MAX_FILES 3

// if changed will trigger a SPIFFS.format() call
const char* spiffsFormatCanary = "/spiffs.1";

// set flag in this CPU core, gets reset in the other CPU core unless second core isn't started yet
/**
 * This is the busy loop usually running on the second core while waiting for the first core to execute
 * the SPIFFS operation. During setup the loops don't run so the _async_fs_wait() function takes care of 
 * running the loop instead of a delay.
 */
#define ASYNCFS_WAIT(index,op) { asyncFiles[index].op = true; while(asyncFiles[index].op) _async_fs_wait(); }

/**
 * When the second core runs a SPIFFS operation the matching flag in this struct is set true. The main loop()
 * polls those flags, executes the operation and fills the result field. Maybe not all volatile declarations
 * are required. Maybe none.
 */
struct t_asyncFile {
  volatile bool free;
  const char* name;
  uint8_t* buffer;
  volatile int len;
  const char* mode;
  volatile bool open;
  volatile bool read;
  volatile bool write;
  volatile bool close;
  volatile bool size;
  volatile int result;
  File file;
};

t_asyncFile asyncFiles[ASYNCFS_MAX_FILES];

bool asyncFsInitialized = false;

void setup_async_fs() {
  DEBUG("AsyncFS: setup: started");
  for(int i=0; i<ASYNCFS_MAX_FILES; i++) {
    asyncFiles[i].free = true;
  }
  if(!SPIFFS.begin(true)){
      DEBUG("SPIFFS Mount Failed");
      return;
  }
  listDir(SPIFFS, "/", 0);
  _async_fs_conditional_format();
  DEBUG("AsyncFS: setup: complete");
}

void setup_async_fs_async() {
//  asyncFsInitialized = true;
}

void loop_async_fs() {
  for(int i=0; i<ASYNCFS_MAX_FILES; i++) {
    if (asyncFiles[i].free) continue;
    if (asyncFiles[i].open) {
      _async_fs_open(i);
    } else if (asyncFiles[i].read) {
      _async_fs_read(i);
    } else if (asyncFiles[i].write) {
      _async_fs_write(i);
    } else if (asyncFiles[i].close) {
      _async_fs_close(i);
    } else if (asyncFiles[i].size) {
      _async_fs_size(i);
    }
  }
}

void _async_fs_wait() {
  if (!asyncFsInitialized) {
    loop_async_fs();
  } else {
    delay(1);
  }
}

int async_fs_open(const char* name, const char* mode) {
  int index = _async_fs_allocate(name, mode);
  if (index < 0) return index;
  ASYNCFS_WAIT(index, open);
  if (asyncFiles[index].result != 0) return asyncFiles[index].result;
  return index;
}

int async_fs_close(int index) {
  ASYNCFS_WAIT(index, close);
  asyncFiles[index].free = true;
  return 0;
}

int async_fs_write(int index, uint8_t* buffer, int len) {
  asyncFiles[index].buffer = buffer;
  asyncFiles[index].len = len;
  ASYNCFS_WAIT(index, write);
  return asyncFiles[index].result;
}

int async_fs_read(int index, uint8_t* buffer, int len) {
  asyncFiles[index].buffer = buffer;
  asyncFiles[index].len = len;
  ASYNCFS_WAIT(index, read);
  return asyncFiles[index].result;
}

int async_fs_size(int index) {
  ASYNCFS_WAIT(index, size);
  return asyncFiles[index].result;
}

int _async_fs_allocate(const char* name, const char* mode) {
  for(int i=0; i<ASYNCFS_MAX_FILES; i++) {
    if ( ! asyncFiles[i].free) continue;
    asyncFiles[i].free = false;
    asyncFiles[i].name = name;
    asyncFiles[i].mode = mode;
    asyncFiles[i].len = 0;
    asyncFiles[i].open = false;
    asyncFiles[i].read = false;
    asyncFiles[i].write = false;
    asyncFiles[i].close = false;
    asyncFiles[i].size = false;
    return i;
  }
  return -1;  
}

void _async_fs_open(int index) {
  asyncFiles[index].file = SPIFFS.open(asyncFiles[index].name, asyncFiles[index].mode);
  if (asyncFiles[index].file) {
    DEBUGf("AsyncFS: _open: #%d [%s] is open for [%s]\n", index, asyncFiles[index].name, asyncFiles[index].mode);
  } else {
    DEBUGf("AsyncFS: _open: #%d [%s] is NOT open for [%s]\n", index, asyncFiles[index].name, asyncFiles[index].mode);
  }
  asyncFiles[index].result = asyncFiles[index].file?0:-1;
  asyncFiles[index].open = false;
}

void _async_fs_close(int index) {
  asyncFiles[index].file.flush();
  asyncFiles[index].file.close();
  asyncFiles[index].close = false;
}

void _async_fs_write(int index) {
  asyncFiles[index].result = asyncFiles[index].file.write(asyncFiles[index].buffer, asyncFiles[index].len);
  asyncFiles[index].write = false;
}

void _async_fs_read(int index) {
  asyncFiles[index].result = asyncFiles[index].file.read(asyncFiles[index].buffer, asyncFiles[index].len);
  asyncFiles[index].read = false;
}

void _async_fs_size(int index) {
  asyncFiles[index].result = asyncFiles[index].file.size();
  asyncFiles[index].size = false;
}

void _async_fs_conditional_format(){
  bool canaryFound = false;
  File root = SPIFFS.open("/");
  if(root) {
    if(root.isDirectory()){
      File file = root.openNextFile();
      while (file) {
        if(!file.isDirectory()) {
          if(strcmp(file.name(), spiffsFormatCanary) == 0) {
            canaryFound = true;
          }
        }
        file = root.openNextFile();
      }
    } else Serial.println("Not a directory");
  } else Serial.println("Failed to open directory");

  if (!canaryFound) {
    Serial.printf("SPIFFS format canary not found, formatting SPIFFS...");
    SPIFFS.format();
    File file = SPIFFS.open(spiffsFormatCanary, FILE_WRITE);
    if (file) {
      file.print(spiffsFormatCanary);
      file.close();
    } else Serial.println("ERROR: unable to create SPIFFS canary file");
  }
}

void listDir(fs::FS &fs, const char * dirname, uint8_t levels){
    Serial.printf("Listing directory: %s\n", dirname);

    File root = fs.open(dirname);
    if(!root){
        Serial.println("Failed to open directory");
        return;
    }
    if(!root.isDirectory()){
        Serial.println("Not a directory");
        return;
    }

    File file = root.openNextFile();
    while(file){
        if(file.isDirectory()){
            Serial.print("  DIR : ");
            Serial.println(file.name());
            if(levels){
                listDir(fs, file.name(), levels -1);
            }
        } else {
            Serial.print("  FILE: ");
            Serial.print(file.name());
            Serial.print("  SIZE: ");
            Serial.println(file.size());
        }
        file = root.openNextFile();
    }
}


