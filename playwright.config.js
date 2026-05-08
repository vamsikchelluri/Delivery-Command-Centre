export default {
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  reporter: [
    ["line"],
    ["html", { open: "never" }]
  ],
  use: {
    baseURL: "http://localhost:4000",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
};
