import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

try {
  // 1. Ensure git status is clean
  const status = execSync("git status --porcelain", {
    encoding: "utf8",
  }).trim();
  if (status) {
    console.error(
      "❌ Git working directory is not clean. Please commit or stash your changes.",
    );
    process.exit(1);
  }

  // 2. Ensure we are on main branch
  const currentBranch = execSync("git branch --show-current", {
    encoding: "utf8",
  }).trim();
  if (currentBranch !== "main") {
    console.error("❌ Please run the release script from the 'main' branch.");
    process.exit(1);
  }

  console.log("📥 Pulling latest changes from main...");
  execSync("git pull origin main");

  // 3. Run standard-version
  console.log(
    "🏷️  Running standard-version to bump version, generate changelog, and tag commit...",
  );
  const args = process.argv.slice(2).join(" ");
  execSync(`npx standard-version ${args}`, { stdio: "inherit" });

  // 4. Read next version
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const nextVersion = pkg.version;

  console.log(`\n✅ Release v${nextVersion} prepared and tagged locally!`);
  console.log(`\nTo publish the release and trigger deployment, run:`);
  console.log(`  git push origin main --follow-tags`);
} catch (error) {
  console.error(
    "❌ An error occurred during release preparation:",
    error.message,
  );
  process.exit(1);
}
