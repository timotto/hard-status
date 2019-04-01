#include "common.h"
#include "hardware.h"

unsigned int _shuffleOrder[LED_PIXEL_COUNT];

void setup_shuffle() {
  const long nextSeed = random(0x7ffffffeL);
  randomSeed(12345);
  for(int i=0; i<LED_PIXEL_COUNT; i++)
    _shuffleOrder[i] = random(LED_PIXEL_COUNT);
  randomSeed(nextSeed);
}

/*
 * Discovered on https://stackoverflow.com/questions/6127503/shuffle-array-in-c
 * Author: http://benpfaff.org/writings/clc/shuffle.html
 * 
 * Adapted to fit this Arduino sketch.
 */
/* Arrange the N elements of ARRAY in random order.
   Only effective if N is much smaller than RAND_MAX;
   if this may not be the case, use a better random
   number generator. */
void shuffle(PixelColor_t *array) {
  for (int i = 0; i < LED_PIXEL_COUNT - 1; i++) {
    int j = _shuffleOrder[i];
    PixelColor_t t = array[j];
    array[j] = array[i];
    array[i] = t;
  }
}
