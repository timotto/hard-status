/**
 * Each pixal has its own animation_state_t in the led_animation_state array.
 * An animation ends after a single cycle. The loop_led() functions takes care of
 * restarting animations. The direction is flipped between 1 and -1 after each
 * cycle. A cycle fades the colors from [0] to [1] or vice versa.
 * 
 * The update frequency is limited to 50Hz because the ESP32 WS2812 implementation 
 * in NeoPixelBus is bit-banging and does not allow the WiFi stack to run.
 * 
 * The WiFi state (disconnected) is shown using a slightly orange background color
 * instead of the default black.
 * 
 * An ongoing OTA download and upgrade is shown using some wile blue/(white|yellow|green)
 * animation. Different OTA methods and changes show a different colors along with blue.
 * 
 * This is the FastLED implementation for Hard Status
 */
#include "common.h"
#include "hardware.h"

PixelColor_t red = CRGB::Red;
PixelColor_t orange = CRGB(255, 165, 0);
PixelColor_t green = CRGB::Green;
PixelColor_t yellow = CRGB::Yellow;
PixelColor_t blue = CRGB(0, 0, 127);
PixelColor_t white = CRGB(127,127,127);
PixelColor_t grey = CRGB(63, 63, 63);
PixelColor_t black_ok = CRGB(0, 0, 0);
PixelColor_t black_disconnected = CRGB(40, 20, 0);
PixelColor_t brown = CRGB(31, 31, 11);
PixelColor_t bluish = CRGB(0, 11, 63);
PixelColor_t black = black_disconnected;

PixelColor_t led_initialColors[2] = {black,green};
int led_initialFactor = 10;
int led_initialDirection = 0;

#define FASTLED_SHOW_CORE 0

#define BRIGHTNESS          60
#define FRAMES_PER_SECOND  120

#define LED_TYPE    WS2812
#define COLOR_ORDER GRB

CRGB leds[LED_PIXEL_COUNT];
CRGB leds_buffer[LED_PIXEL_COUNT];

struct animation_state_t
{
  CRGB colors[2];
  uint16_t time;
  int8_t direction;
};

animation_state_t led_animation_state[LED_PIXEL_COUNT];

AnimEaseFunction easings[] = {NeoEase::CubicIn, NeoEase::CubicOut};

NeoPixelAnimator animations(LED_PIXEL_COUNT, NEO_MILLISECONDS);

static TaskHandle_t FastLEDshowTaskHandle = 0;
static TaskHandle_t userTaskHandle = 0;

/** show() for ESP32
 *  Call this function instead of FastLED.show(). It signals core 0 to issue a show, 
 *  then waits for a notification that it is done.
 */
void FastLEDshowESP32() {
  if (userTaskHandle != 0) 
    return;

  // -- Store the handle of the current task, so that the show task can
  //    notify it when it's done
  userTaskHandle = xTaskGetCurrentTaskHandle();

  // -- Trigger the show task
  xTaskNotifyGive(FastLEDshowTaskHandle);

  // -- Wait to be notified that it's done
  const TickType_t xMaxBlockTime = pdMS_TO_TICKS( 250 );
  ulTaskNotifyTake(pdTRUE, xMaxBlockTime);
  userTaskHandle = 0;
}

/** show Task
 *  This function runs on core 0 and just waits for requests to call FastLED.show()
 */
void FastLEDshowTask(void *pvParameters) {
    // -- Run forever...
    for(;;) {
        // -- Wait for the trigger
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);

        // -- Do the show (synchronously)
        FastLED.show();

        // -- Notify the calling task
        xTaskNotifyGive(userTaskHandle);
    }
}

void setup_led() {
  FastLED.addLeds<LED_TYPE,LED_PIN,COLOR_ORDER>(leds_buffer, LED_PIXEL_COUNT).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setDither( 0 );

    int core = xPortGetCoreID();
    Serial.print("Main code running on core ");
    Serial.println(core);
    xTaskCreatePinnedToCore(FastLEDshowTask, "FastLEDshowTask", 2048, NULL, 2, &FastLEDshowTaskHandle, FASTLED_SHOW_CORE);

  led_update_brightness();
  setupAnimations();
  led_show_wifi();
}

void loop_led() {
  loop_led(false);
}

void loop_led_force() {
  loop_led(true);
}

void loop_led(bool force) {
  static uint32_t next = 0;
  const uint32_t now = millis();
  if (!force && next > now) return;
  next = now + 20;

  restartFinishedAnimations();
  animations.UpdateAnimations();

  for(int i=0; i<LED_PIXEL_COUNT;i++) leds_buffer[i] = leds[i];
  FastLEDshowESP32();
}

void led_update_brightness() {
  FastLED.setBrightness(config.brightness);
}

void led_set_color(int pixel, PixelColor_t from, PixelColor_t to) {
  if (led_animation_state[pixel].colors[0] == to && led_animation_state[pixel].colors[1] == from) return;
  
  const int factor = to == black ? 10 : 1;

  led_animation_state[pixel].colors[0] = to;
  led_animation_state[pixel].colors[1] = from;
  led_animation_state[pixel].time = random(100 * factor, 400 * factor);
}

PixelColor_t codeToColor(char code) {
  switch(code) {
    case ' ': return black;
    case 'u': return grey;
    case 's': return yellow;
    case '+': return green;
    case 'e': return orange;
    case '-': return red;
    case 'a': return brown;
    case 'p': return bluish;
    default : return black;
  }
}

void led_show_ota() {
  switch(otaState) {
    case OTA_STATE_IDLE: 
      return;
    case OTA_STATE_PUSH: 
      led_initialColors[0] = blue;
      led_initialColors[1] = green;
      led_initialFactor = 1;
      led_initialDirection = 0;
      break;
    case OTA_STATE_LOAD: 
      led_initialColors[0] = blue;
      led_initialColors[1] = yellow;
      led_initialFactor = 5;
      led_initialDirection = 0;
      break;
    case OTA_STATE_FLASH: 
      led_initialColors[0] = blue;
      led_initialColors[1] = white;
      led_initialFactor = 2;
      led_initialDirection = 0;
      break;
    case OTA_STATE_ERROR: 
      led_initialColors[0] = orange;
      led_initialColors[1] = red;
      led_initialFactor = 1;
      led_initialDirection = 0;
      break;
  }
  setupAnimations();
  loop_led_force();
}

void led_show_wifi() {
  PixelColor_t next;
  switch(wifiState) {
    case WL_CONNECTED:
      next = black_ok;
      break;
    default:
      next = black_disconnected;
      break;
  }
  for (uint16_t i = 0; i < LED_PIXEL_COUNT; i++) {
    if(led_animation_state[i].colors[0] == black) led_animation_state[i].colors[0] = next;
  }
  black = next;
}

void setupAnimations() {
  for (uint16_t i = 0; i < LED_PIXEL_COUNT; i++) {
    led_animation_state[i].colors[0] = led_initialColors[0];
    led_animation_state[i].colors[1] = led_initialColors[1];
    led_animation_state[i].direction = led_initialDirection;
    led_animation_state[i].time = random(100 * led_initialFactor, 400 * led_initialFactor);
    animations.StartAnimation(i, led_animation_state[i].time, animationHandler);
  }
}

void restartFinishedAnimations() {
  for(int i=0;i<LED_PIXEL_COUNT;i++) {
    if (animations.IsAnimationActive(i)) continue;
    
    led_animation_state[i].direction = 1 - led_animation_state[i].direction;
    animations.StartAnimation(i, led_animation_state[i].time, animationHandler);
  }
}

void animationHandler(const AnimationParam& param) {
    AnimEaseFunction easing = easings[led_animation_state[param.index].direction];
    PixelColor_t from = led_animation_state[param.index].colors[led_animation_state[param.index].direction];
    PixelColor_t to = led_animation_state[param.index].colors[1 - led_animation_state[param.index].direction];

    const float progress = easing(param.progress);
    const float progressInv = 1.0 - progress;

  CRGB updatedColor = CRGB(
    from.r * progressInv + to.r * progress, 
    from.g * progressInv + to.g * progress, 
    from.b * progressInv + to.b * progress);
    
  leds[param.index] = updatedColor;
}

