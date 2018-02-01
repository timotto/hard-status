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
 */
#include "common.h"
#include "hardware.h"

struct animation_state_t
{
  RgbColor colors[2];
  uint16_t time;
  int8_t direction;
};

animation_state_t led_animation_state[LED_PIXEL_COUNT];

AnimEaseFunction easings[] = {NeoEase::CubicIn, NeoEase::CubicOut};

RgbColor red(255, 0, 0);
RgbColor orange(255, 191, 0);
RgbColor green(0, 255, 0);
RgbColor yellow(191, 191, 0);
RgbColor blue(0, 0, 127);
RgbColor white(127);
RgbColor grey(63, 63, 63);
RgbColor black_ok(0, 0, 0);
RgbColor black_disconnected(40, 20, 0);
RgbColor brown(31, 31, 11);
RgbColor bluish(0, 11, 63);
RgbColor black = black_disconnected;

RgbColor led_initialColors[2] = {black,green};
int led_initialFactor = 10;
int led_initialDirection = 0;

NeoPixelAnimator animations(LED_PIXEL_COUNT, NEO_MILLISECONDS);

NeoPixelBrightnessBus<NeoGrbFeature, NeoEsp32BitBangWs2813Method> strip(LED_PIXEL_COUNT, LED_PIN);

void setup_led() {
  strip.Begin();
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
  restartFinishedAnimations();
  animations.UpdateAnimations();

  static uint32_t next = 0;
  const uint32_t now = millis();
  if (!force && next > now) return;
  next = now + 20;

  delay(1);
  strip.Show();
}

void led_update_brightness() {
  strip.SetBrightness(config.brightness);
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
    RgbColor from = led_animation_state[param.index].colors[led_animation_state[param.index].direction];
    RgbColor to = led_animation_state[param.index].colors[1 - led_animation_state[param.index].direction];

    float progress = easing(param.progress);

    RgbColor updatedColor = RgbColor::LinearBlend(from, to, progress);
    strip.SetPixelColor(param.index, updatedColor);
}

void led_set_color(int pixel, RgbColor from, RgbColor to) {
  if (led_animation_state[pixel].colors[0] == to && led_animation_state[pixel].colors[1] == from) return;
  
  const int factor = to == black ? 10 : 1;

  led_animation_state[pixel].colors[0] = to;
  led_animation_state[pixel].colors[1] = from;
  led_animation_state[pixel].time = random(100 * factor, 400 * factor);
}

RgbColor codeToColor(char code) {
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
  RgbColor next;
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

