/**
 * Each pixal has its own animation_state_t in the led_animation_state array.
 * An animation ends after a single cycle. The loop_led() functions takes care of
 * restarting animations. The direction is flipped between 1 and -1 after each
 * cycle. A cycle fades the colors from [0] to [1] or vice versa.
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
PixelColor_t greenish = CRGB(0, 63, 15);
PixelColor_t yellow = CRGB::Yellow;
PixelColor_t blue = CRGB(0, 0, 127);
PixelColor_t white = CRGB(127,127,127);
PixelColor_t grey = CRGB(63, 63, 63);
PixelColor_t black = CRGB(0, 0, 0);
//PixelColor_t brown = CRGB(31, 31, 11);
PixelColor_t purple = CRGB(0x99, 0, 0xcc);
PixelColor_t purple_hard = CRGB(0xff, 0, 0xff);
PixelColor_t bluish = CRGB(0, 15, 63);

PixelColor_t led_initialColors[2] = {black, bluish};
int led_initialFactor = 10;
int led_initialDirection = 0;

#define FASTLED_SHOW_CORE 1

#define BRIGHTNESS          10
#define FRAMES_PER_SECOND  120

#define LED_TYPE    WS2812
#define COLOR_ORDER GRB

CRGB leds[LED_PIXEL_COUNT];
CRGB leds_buffer[LED_PIXEL_COUNT];

struct animation_state_t
{
  CRGB colors[2];
  CRGB colorsBuffer[2];
  float randomFactor;
  int8_t direction;
};

animation_state_t led_animation_state[LED_PIXEL_COUNT];

AnimEaseFunction easings[] = {NeoEase::CubicIn, NeoEase::CubicOut};

NeoPixelAnimator animations(LED_PIXEL_COUNT, NEO_MILLISECONDS);

void setup_led() {
  FastLED.addLeds<LED_TYPE,LED_PIN,COLOR_ORDER>(leds_buffer, LED_PIXEL_COUNT).setCorrection(TypicalLEDStrip);
  FastLED.setBrightness(BRIGHTNESS);
  FastLED.setDither( 0 );

  led_update_brightness();
  setupAnimations();
  led_show_wifi();
}

void loop_led() {
  restartFinishedAnimations();
  animations.UpdateAnimations();

  for(int i=0; i<LED_PIXEL_COUNT;i++)
    leds_buffer[i] = leds[i];
  shuffle(leds_buffer);

  FastLED.show();
}

void led_update_brightness() {
  FastLED.setBrightness(config.brightness);
}

uint16_t _led_animation_time(uint32_t pixel) {
  
  const float a = led_animation_state[pixel].colorsBuffer[0] == led_initialColors[0] ? 10.0 : 1.0;
  const float b = (float)config.pulseFrequency;
  const float c = dynamicPulseRatio;
  const float d = led_animation_state[pixel].randomFactor;

  const float x = a * b * c * d;
  const uint16_t z = (uint16_t) x;

//  Serial.printf("z=%d a=%.1f b=%.1f c=%.1f d=%.1f x=%.1f\n", z, a, b, c, d, x);
  
  return z;
}

void led_set_color(int pixel, PixelColor_t from, PixelColor_t to) {
  if (led_animation_state[pixel].colors[0] == to && led_animation_state[pixel].colors[1] == from) return;
  
  led_animation_state[pixel].colors[0] = to;
  led_animation_state[pixel].colors[1] = from;
  led_animation_state[pixel].randomFactor = (float)random(10000, 40000) / 10000.0;
}

void led_set_idle(int pixel, bool trueIsGoodFalseIsBad) {
  PixelColor_t c = trueIsGoodFalseIsBad ? green : red;
  led_set_color(pixel, c, black);
}

PixelColor_t codeToColor(char code) {
  switch(code) {
    case ' ': return black;
    case 'u': return grey;
    case 's': return yellow;
    case '+': return green;
    case 'e': return purple_hard;
    case '-': return red;
    case 'a': return purple;
    case 'p': return bluish;
    default : return black;
  }
}

void led_show_progress(PixelColor_t colorDone, PixelColor_t colorPending, unsigned int progress, unsigned int total) {
  const unsigned int limit = LED_PIXEL_COUNT * progress / total;
  unsigned int i;
  
  for(i=0;i<limit;i++) leds_buffer[i] = colorDone;
  for(i=limit;i<LED_PIXEL_COUNT;i++) leds_buffer[i] = colorPending;
  shuffle(leds_buffer);
  
  FastLED.setBrightness(5);
  FastLED.show();
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
    case OTA_STATE_REBOOT: 
      led_initialColors[0] = black;
      led_initialColors[1] = black;
      led_initialFactor = 1;
      led_initialDirection = 0;
      break;
  }
  setupAnimations();
}

void led_show_wifi() {
  PixelColor_t c;
  switch(wifiState) {
    case WL_CONNECTED:
      c = bluish;
      break;
    default:
      c = yellow;
      break;
  }
  
  for (uint16_t i = 0; i < LED_PIXEL_COUNT; i++) {
    led_set_color(i, c, black);
  }
}

void setupAnimations() {
  for (uint16_t i = 0; i < LED_PIXEL_COUNT; i++) {
    led_animation_state[i].colors[0] = led_initialColors[0];
    led_animation_state[i].colorsBuffer[0] = led_initialColors[0];
    led_animation_state[i].colors[1] = led_initialColors[1];
    led_animation_state[i].colorsBuffer[1] = led_initialColors[1];
    led_animation_state[i].direction = led_initialDirection;
    led_animation_state[i].randomFactor = (float)random(10000, 40000) / 10000.0;
    animations.StartAnimation(i, _led_animation_time(i), animationHandler);
  }
}

void restartFinishedAnimations() {
  for(int i=0;i<LED_PIXEL_COUNT;i++) {
    if (animations.IsAnimationActive(i)) continue;
    
    // only change color which is currently at 0%
    uint8_t d = led_animation_state[i].direction;
    if (led_animation_state[i].colorsBuffer[d] != led_animation_state[i].colors[d]) {
      led_animation_state[i].colorsBuffer[d] = led_animation_state[i].colors[d];
    }
    led_animation_state[i].direction = 1 - d;
    animations.StartAnimation(i, _led_animation_time(i), animationHandler);
  }
}

void animationHandler(const AnimationParam& param) {
    AnimEaseFunction easing = easings[led_animation_state[param.index].direction];
    PixelColor_t from = led_animation_state[param.index].colorsBuffer[led_animation_state[param.index].direction];
    PixelColor_t to = led_animation_state[param.index].colorsBuffer[1 - led_animation_state[param.index].direction];

    const float progress = easing(param.progress);
    const float progressInv = 1.0 - progress;

  CRGB updatedColor = CRGB(
    from.r * progressInv + to.r * progress, 
    from.g * progressInv + to.g * progress, 
    from.b * progressInv + to.b * progress);
    
  leds[param.index] = updatedColor;
}

