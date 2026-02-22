#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";

const program = new Command();
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;

type PackageManager = (typeof PACKAGE_MANAGERS)[number];

type InteractiveOptions = {
  packageManager: PackageManager;
  installDependencies: boolean;
};

async function promptForProjectName(): Promise<string | null> {
  if (!input.isTTY || !output.isTTY) {
    return null;
  }

  const rl = createInterface({ input, output });
  try {
    while (true) {
      const projectName = (await rl.question("Project name: ")).trim();
      if (!projectName) {
        console.log(pc.yellow("Project name is required."));
        continue;
      }

      const confirm = (
        await rl.question(`Create project "${projectName}"? (Y/n): `)
      )
        .trim()
        .toLowerCase();

      if (confirm === "n" || confirm === "no") {
        continue;
      }

      return projectName;
    }
  } finally {
    rl.close();
  }
}

function parsePackageManager(value: string): PackageManager | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "1" || normalized === "npm") {
    return "npm";
  }
  if (normalized === "2" || normalized === "pnpm") {
    return "pnpm";
  }
  if (normalized === "3" || normalized === "yarn") {
    return "yarn";
  }
  if (normalized === "4" || normalized === "bun") {
    return "bun";
  }
  return null;
}

function parseYesNo(value: string, defaultYes: boolean): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultYes;
  return normalized !== "n" && normalized !== "no";
}

async function promptForInteractiveOptions(): Promise<InteractiveOptions> {
  const rl = createInterface({ input, output });
  try {
    let packageManager: PackageManager | null = null;
    while (!packageManager) {
      const answer = await rl.question(
        "Package manager (1:npm, 2:pnpm, 3:yarn, 4:bun) [1]: ",
      );
      packageManager = parsePackageManager(answer);
      if (!packageManager) {
        console.log(pc.yellow("Please choose 1, 2, 3, 4 or a package manager name."));
      }
    }

    const installAnswer = await rl.question("Install dependencies now? (Y/n): ");
    return {
      packageManager,
      installDependencies: parseYesNo(installAnswer, true),
    };
  } finally {
    rl.close();
  }
}

function getInstallCommand(packageManager: PackageManager): {
  command: string;
  args: string[];
  display: string;
} {
  if (packageManager === "yarn") {
    return { command: "yarn", args: [], display: "yarn" };
  }
  return {
    command: packageManager,
    args: ["install"],
    display: `${packageManager} install`,
  };
}

function getDevCommand(packageManager: PackageManager): string {
  if (packageManager === "npm") {
    return "npm run dev";
  }
  if (packageManager === "bun") {
    return "bun run dev";
  }
  return `${packageManager} dev`;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")}`.trim()));
    });
  });
}

program
  .name("create-agent-sdk-starter")
  .description("Scaffold a production-ready Next.js + OpenAI Agents SDK app")
  .argument("[project-name]", "Directory name for the new project")
  .action(async (projectNameArg?: string) => {
    const isInteractiveRun =
      !projectNameArg?.trim() && input.isTTY && output.isTTY;
    const projectName = projectNameArg?.trim() || (await promptForProjectName());
    if (!projectName) {
      console.error(
        pc.red(
          "Project name is required. Pass one as an argument or run in an interactive terminal.",
        ),
      );
      process.exitCode = 1;
      return;
    }

    let packageManager: PackageManager = "npm";
    let installDependencies = false;
    if (isInteractiveRun) {
      const options = await promptForInteractiveOptions();
      packageManager = options.packageManager;
      installDependencies = options.installDependencies;
    }

    const targetDir = path.resolve(process.cwd(), projectName);
    const templateDir = path.resolve(__dirname, "../templates/default");

    if (await fs.pathExists(targetDir)) {
      console.error(pc.red(`Target directory already exists: ${targetDir}`));
      process.exitCode = 1;
      return;
    }

    if (!(await fs.pathExists(templateDir))) {
      console.error(pc.red(`Template directory not found: ${templateDir}`));
      process.exitCode = 1;
      return;
    }

    console.log(pc.green("Creating Agent SDK starter project..."));
    await fs.copy(templateDir, targetDir);

    const gitignoreTemplatePath = path.join(targetDir, "gitignore");
    const gitignorePath = path.join(targetDir, ".gitignore");
    if (
      (await fs.pathExists(gitignoreTemplatePath)) &&
      !(await fs.pathExists(gitignorePath))
    ) {
      await fs.move(gitignoreTemplatePath, gitignorePath);
    }

    if (installDependencies) {
      const installCommand = getInstallCommand(packageManager);
      console.log(pc.cyan(`Installing dependencies with ${installCommand.display}...`));
      try {
        await runCommand(installCommand.command, installCommand.args, targetDir);
      } catch (error) {
        console.error(
          pc.red(
            error instanceof Error
              ? error.message
              : "Dependency installation failed.",
          ),
        );
        console.log(
          pc.yellow(
            `You can install later by running "${installCommand.display}" inside ${projectName}.`,
          ),
        );
      }
    }

    console.log(pc.blue("Project created successfully with BixAI starter."));
    console.log("\nNext steps:");
    console.log(`  cd ${projectName}`);
    if (!installDependencies) {
      console.log(`  ${getInstallCommand(packageManager).display}`);
    }
    console.log("  cp .env.local.example .env.local  # add your OPENAI_API_KEY");
    console.log(`  ${getDevCommand(packageManager)}`);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
