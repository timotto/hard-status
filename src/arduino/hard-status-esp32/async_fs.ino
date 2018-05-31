#include "common.h"

// if changed will trigger a SPIFFS.format() call
const char* spiffsFormatCanary = "/spiffs.1";

void setup_fs() {
  DEBUG("FS: setup: started");
  if(!SPIFFS.begin(true)){
      DEBUG("SPIFFS Mount Failed");
      return;
  }
  listDir(SPIFFS, "/", 0);
  _fs_conditional_format();
  DEBUG("FS: setup: complete");
}

void _fs_conditional_format(){
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


