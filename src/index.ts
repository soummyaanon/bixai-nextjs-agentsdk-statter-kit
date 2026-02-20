#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import pc from "picocolors";

const program = new Command();

program
  .name("create-agent-sdk-starter")
  .description("Scaffold a production-ready Next.js + OpenAI Agents SDK app")
  .argument("<project-name>", "Directory name for the new project")
  .action(async (projectName: string) => {
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

    console.log(pc.blue("Project created successfully with BixAI starter."));
    console.log("\nNext steps:");
    console.log(`  cd ${projectName}`);
    console.log("  npm install");
    console.log("  cp .env.local.example .env.local  # add your OPENAI_API_KEY");
    console.log("  npm run dev");
  });

program.parseAsync().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
