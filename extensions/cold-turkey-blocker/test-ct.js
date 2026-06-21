const { execSync } = require("child_process");
const os = require("os");

const isWindows = os.platform() === "win32";
const CT_PATH = isWindows
  ? `"C:\\Program Files\\Cold Turkey\\Cold Turkey Blocker.exe"`
  : `"/Applications/Cold Turkey Blocker.app/Contents/MacOS/Cold Turkey Blocker"`;

const commandsToTest = [
  // 0. Native Help Menu
  { desc: "Print Native Help Menu", cmd: `-help` },

  // 1. Creation & Setup
  { desc: "List existing blocks (Baseline)", cmd: `-list-blocks` },
  { desc: "Create a test website block", cmd: `-add-block "Raycast_Test_Web"` },
  { desc: "Create a test device block (Safe standard)", cmd: `-add-device-block "Raycast_Test_Device"` },
  {
    desc: "Create a test device block (Sign Out - NOT STARTED)",
    cmd: `-add-device-block "Raycast_Test_SignOut" -sign-out`,
  },
  {
    desc: "Create a test device block (Shut Down - NOT STARTED)",
    cmd: `-add-device-block "Raycast_Test_ShutDown" -shut-down`,
  },
  { desc: "Add a website to the test block", cmd: `-add "Raycast_Test_Web" -web "example.com"` },
  { desc: "Add an exception to the test block", cmd: `-add "Raycast_Test_Web" -exception "example.com/safe"` },

  // 2. Basic Controls
  { desc: "Check initial status", cmd: `-status "Raycast_Test_Web"` },
  { desc: "Start the block (Basic)", cmd: `-start "Raycast_Test_Web"` },
  { desc: "Check status after Basic Start", cmd: `-status "Raycast_Test_Web"` },
  { desc: "Stop the block (Basic)", cmd: `-stop "Raycast_Test_Web"` },
  { desc: "Start the block (As-Is)", cmd: `-start "Raycast_Test_Web" -as-is` },
  { desc: "Toggle the block OFF", cmd: `-toggle "Raycast_Test_Web"` },

  // 3. Locks (Applied to dummy block so it won't affect work)
  { desc: "Start with Password Lock", cmd: `-start "Raycast_Test_Web" -password testpass` },
  { desc: "Stop Password Lock", cmd: `-stop "Raycast_Test_Web" -password testpass` },
  { desc: "Start with Random Text Lock (5 chars)", cmd: `-start "Raycast_Test_Web" -random-text 5` },

  // 4. Breaks
  { desc: "Stop Random Text Break", cmd: `-stop-random-text-break "Raycast_Test_Web"` },
  { desc: "Start Delay Break", cmd: `-start-delay-break "Raycast_Test_Web"` },
  { desc: "Stop Delay Break", cmd: `-stop-delay-break "Raycast_Test_Web"` },

  // 5. Timer Lock
  { desc: "Start with Timer Lock (1 minute)", cmd: `-start "Raycast_Test_Web" -lock 1` },
  { desc: "Final Status Check (Should be locked)", cmd: `-status "Raycast_Test_Web"` },
];

console.log("==========================================");
console.log("Starting Exhaustive Cold Turkey CLI Test...");
console.log("==========================================\n");

for (const item of commandsToTest) {
  console.log(`\n▶ ${item.desc}`);
  console.log(`  Executing: ${item.cmd}`);

  try {
    const output = execSync(`${CT_PATH} ${item.cmd}`, { encoding: "utf-8", stdio: "pipe" });
    const formattedOutput = output.trim()
      ? output.trim()
      : "(Command executed successfully, but returned no text output)";
    console.log(`  Output:\n  => ${formattedOutput.split("\n").join("\n  => ")}`);
  } catch (error) {
    const errorOutput = error.stderr ? error.stderr.trim() : error.message;
    console.log(`  Error Output:\n  => ${errorOutput.split("\n").join("\n  => ")}`);
  }
}

console.log("\n==========================================");
console.log("Test Complete! Copy the output above.");
console.log("==========================================");
