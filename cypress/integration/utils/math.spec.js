const { percentage } = require("../../../utils/math");

describe("Testing Percentage Calculation Works", () => {
  it("two integers works", () => {
    expect(percentage(10, 100)).to.eq(10);
    expect(percentage(50, 150)).to.be.closeTo(33.33333, 5);
    expect(percentage(3, 5)).to.eq(60);
  });

  it("mixed int/string params works", () => {
    expect(percentage("10", 100)).to.eq(10);
    expect(percentage(10, "100")).to.eq(10);
  });

  it("float paramteres works", () => {
    expect(percentage(14.64, 133.2)).to.be.closeTo(10.99, 2);
  });
});
