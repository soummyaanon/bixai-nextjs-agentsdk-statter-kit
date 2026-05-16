#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { readFileSync, readdirSync, type Dirent } from "node:fs";

const POSTHOG_API_KEY = "phc_240ugUeWemNlWOlp4pyhgtjjkTbnoBHRkdw1jlf98RQ";

const PKG = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
) as { version: string };
const CLI_VERSION = PKG.version;

let telemetryEnabledFlag = true;

function isTelemetryEnabled(): boolean {
  if (!telemetryEnabledFlag) return false;
  if (process.env.BIXAI_TELEMETRY === "0") return false;
  if (process.env.DO_NOT_TRACK === "1") return false;
  return true;
}

function trackEvent(event: string, properties: Record<string, string> = {}): void {
  if (!isTelemetryEnabled()) return;

  const distinctId = createHash("sha256")
    .update(hostname())
    .digest("hex")
    .slice(0, 16);

  const body = JSON.stringify({
    api_key: POSTHOG_API_KEY,
    event,
    properties: {
      distinct_id: distinctId,
      platform: process.platform,
      node_version: process.version,
      cli_version: CLI_VERSION,
      ...properties,
    },
    timestamp: new Date().toISOString(),
  });

  // Fire-and-forget — never blocks or fails the CLI
  fetch("https://us.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}

const program = new Command();
const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;

type PackageManager = (typeof PACKAGE_MANAGERS)[number];

type InteractiveOptions = {
  packageManager: PackageManager;
  installDependencies: boolean;
};

type CliOptions = {
  yes?: boolean;
  pm?: string;
  install?: boolean;
  skipInstall?: boolean;
  telemetry: boolean;
  git: boolean;
  template?: string;
};

const DEFAULT_TEMPLATE = "default";

function listAvailableTemplates(): string[] {
  const templatesRoot = path.resolve(__dirname, "../templates");
  try {
    return readdirSync(templatesRoot, { withFileTypes: true })
      .filter((entry: Dirent) => entry.isDirectory())
      .map((entry: Dirent) => entry.name)
      .sort();
  } catch {
    return [DEFAULT_TEMPLATE];
  }
}

function validateProjectName(name: string): string | null {
  if (!name) return "Project name is required.";
  if (name === "." || name === "..") return "Project name cannot be '.' or '..'.";
  if (name.includes("/") || name.includes("\\")) {
    return "Project name cannot contain path separators.";
  }
  if (name.startsWith("-")) return "Project name cannot start with a dash.";
  if (/[\s]/.test(name)) return "Project name cannot contain whitespace.";
  return null;
}

async function promptForProjectName(): Promise<string | null> {
  if (!input.isTTY || !output.isTTY) {
    return null;
  }

  const rl = createInterface({ input, output });
  try {
    while (true) {
      const projectName = (await rl.question("Project name: ")).trim();
      const error = validateProjectName(projectName);
      if (error) {
        console.log(pc.yellow(error));
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
  if (!normalized || normalized === "1" || normalized === "pnpm") {
    return "pnpm";
  }
  if (normalized === "2" || normalized === "npm") {
    return "npm";
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
        "Package manager (1:pnpm, 2:npm, 3:yarn, 4:bun) [1]: ",
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
  options: { silent?: boolean } = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: options.silent ? "ignore" : "inherit",
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

async function initGitRepo(targetDir: string): Promise<boolean> {
  try {
    await runCommand("git", ["init", "-q"], targetDir, { silent: true });
    await runCommand("git", ["add", "-A"], targetDir, { silent: true });
    await runCommand(
      "git",
      [
        "commit",
        "-m",
        "Initial commit from @bixai/create-agent-sdk-starter",
        "--quiet",
      ],
      targetDir,
      { silent: true },
    );
    return true;
  } catch {
    return false;
  }
}

program
  .name("create-agent-sdk-starter")
  .description("Scaffold a production-ready Next.js + OpenAI Agents SDK app")
  .version(CLI_VERSION)
  .argument("[project-name]", "Directory name for the new project")
  .option("-y, --yes", "skip prompts and use sensible defaults")
  .option("--pm <manager>", "package manager: pnpm | npm | yarn | bun")
  .option("--install", "install dependencies after scaffolding")
  .option("--skip-install", "skip installing dependencies")
  .option("--no-telemetry", "disable anonymous usage telemetry")
  .option("--no-git", "skip git repository initialization")
  .option(
    "-t, --template <name>",
    `template to scaffold (one of: ${listAvailableTemplates().join(", ")})`,
    DEFAULT_TEMPLATE,
  )
  .action(async (projectNameArg: string | undefined, opts: CliOptions) => {
    if (opts.telemetry === false) telemetryEnabledFlag = false;
    trackEvent("cli_invoked");

    const isTTY = Boolean(input.isTTY && output.isTTY);
    const skipPrompts = Boolean(opts.yes) || !isTTY;

    // Resolve project name
    let projectName = projectNameArg?.trim();
    if (!projectName) {
      if (skipPrompts) {
        console.error(
          pc.red(
            "Project name is required. Pass one as an argument or run in an interactive terminal.",
          ),
        );
        process.exitCode = 1;
        return;
      }
      const prompted = await promptForProjectName();
      projectName = prompted ?? undefined;
      if (!projectName) {
        console.error(pc.red("Project name is required."));
        process.exitCode = 1;
        return;
      }
    } else {
      const nameError = validateProjectName(projectName);
      if (nameError) {
        console.error(pc.red(nameError));
        process.exitCode = 1;
        return;
      }
    }

    // Resolve package manager
    let packageManager: PackageManager = "pnpm";
    if (opts.pm) {
      const parsed = parsePackageManager(opts.pm);
      if (!parsed) {
        console.error(
          pc.red(
            `Unknown package manager: ${opts.pm}. Use one of: ${PACKAGE_MANAGERS.join(", ")}.`,
          ),
        );
        process.exitCode = 1;
        return;
      }
      packageManager = parsed;
    }

    // Resolve install flag
    let installDependencies: boolean;
    if (opts.skipInstall) {
      installDependencies = false;
    } else if (opts.install) {
      installDependencies = true;
    } else if (opts.yes) {
      installDependencies = true;
    } else {
      installDependencies = false;
    }

    // Full interactive prompts only when no project arg, TTY, not -y, no flags overriding
    const fullInteractive =
      !projectNameArg && isTTY && !opts.yes && !opts.pm && !opts.install && !opts.skipInstall;
    if (fullInteractive) {
      const interactive = await promptForInteractiveOptions();
      packageManager = interactive.packageManager;
      installDependencies = interactive.installDependencies;
    }

    const templateName = (opts.template ?? DEFAULT_TEMPLATE).trim();
    const availableTemplates = listAvailableTemplates();
    if (!availableTemplates.includes(templateName)) {
      console.error(
        pc.red(
          `Unknown template: ${templateName}. Available: ${availableTemplates.join(", ")}.`,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const targetDir = path.resolve(process.cwd(), projectName);
    const templateDir = path.resolve(__dirname, "../templates", templateName);

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

    if (isTelemetryEnabled()) {
      console.log(
        pc.dim(
          "Anonymous usage telemetry enabled. Set BIXAI_TELEMETRY=0 or pass --no-telemetry to opt out.",
        ),
      );
    }

    console.log(pc.green("Creating Agent SDK starter project..."));
    // npm pack strips node_modules from the published tarball, but a local
    // dev install may have these directories. Skip them defensively so the
    // scaffold never inherits megabytes of stale state.
    const SCAFFOLD_SKIP = new Set([
      "node_modules",
      ".next",
      ".turbo",
      ".vercel",
      "tsconfig.tsbuildinfo",
    ]);
    await fs.copy(templateDir, targetDir, {
      filter: (src: string) => !SCAFFOLD_SKIP.has(path.basename(src)),
    });

    const gitignoreTemplatePath = path.join(targetDir, "gitignore");
    const gitignorePath = path.join(targetDir, ".gitignore");
    if (
      (await fs.pathExists(gitignoreTemplatePath)) &&
      !(await fs.pathExists(gitignorePath))
    ) {
      await fs.move(gitignoreTemplatePath, gitignorePath);
    }

    // Drop lockfiles that don't match the chosen package manager so the user
    // doesn't carry a stale lock from another manager into their project.
    const lockfileByManager: Record<PackageManager, string> = {
      npm: "package-lock.json",
      pnpm: "pnpm-lock.yaml",
      yarn: "yarn.lock",
      bun: "bun.lock",
    };
    const keep = lockfileByManager[packageManager];
    await Promise.all(
      Object.values(lockfileByManager)
        .filter((name) => name !== keep)
        .map((name) => fs.remove(path.join(targetDir, name))),
    );

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

    let gitInitialized = false;
    if (opts.git !== false) {
      gitInitialized = await initGitRepo(targetDir);
    }

    trackEvent("cli_project_created", {
      package_manager: packageManager,
      install_deps: String(installDependencies),
      git_initialized: String(gitInitialized),
      template: templateName,
    });

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
