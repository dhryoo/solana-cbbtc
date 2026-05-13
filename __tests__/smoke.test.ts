describe("smoke", () =>
{
    it("environment is alive", () =>
    {
        expect(1 + 1).toBe(2);
    });

    it("typescript strict mode works", () =>
    {
        const value: number = 42;
        expect(typeof value).toBe("number");
    });
});
