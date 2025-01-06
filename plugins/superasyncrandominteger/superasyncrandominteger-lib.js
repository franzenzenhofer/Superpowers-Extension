
export function generateRandomInteger(timeMs, minVal, maxVal) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const randomInt = Math.floor(Math.random() * (maxVal - minVal + 1) + minVal);
      resolve(randomInt);
    }, timeMs);
  });
}