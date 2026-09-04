import { Dimensions, PixelRatio } from 'react-native';

/**
 * Percentage of the screen, in device-independent pixels.
 *
 * Every width, height and margin in the app goes through these, so a layout
 * built on a phone stays in proportion on a tablet and on a small Android.
 *
 * parseFloat is kept so `wp(50)` and `wp('50%')` both work — screens written
 * either way already exist.
 */
export const widthPercentageToDP = (widthPercent: number | string): number => {
  const screenWidth = Dimensions.get('window').width;
  const elemWidth = parseFloat(String(widthPercent));
  return PixelRatio.roundToNearestPixel((screenWidth * elemWidth) / 100);
};

export const heightPercentageToDP = (heightPercent: number | string): number => {
  const screenHeight = Dimensions.get('window').height;
  const elemHeight = parseFloat(String(heightPercent));
  return PixelRatio.roundToNearestPixel((screenHeight * elemHeight) / 100);
};
