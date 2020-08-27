module.exports = {
  countSecondsDiff(begin) {
    const end = new Date();
    const dif = begin.getTime() - end.getTime();
    return Math.abs(dif / 1000);
  },
};
