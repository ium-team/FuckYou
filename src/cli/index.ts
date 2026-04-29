#!/usr/bin/env node
import { handleCommand } from "./commands.js";

const exitCode = await handleCommand(process.argv.slice(2));
process.exitCode = exitCode;
