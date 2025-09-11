#!/usr/bin/env ts-node

/**
 * React Compiler Tracker
 *
 * This script tracks which components can be compiled by React Compiler and which cannot.
 * It provides both CI and local development tools to enforce Rules of React compliance.
 */
import {execSync} from 'child_process';
import {existsSync, readFileSync, writeFileSync} from 'fs';
import {join} from 'path';

interface CompilerResults {
    success: string[];
    failure: string[];
}

interface ComponentStatus {
    file: string;
    canCompile: boolean;
    lastChecked: string;
}

interface TrackerData {
    components: Record<string, ComponentStatus>;
    lastFullCheck: string;
    version: string;
}

const TRACKER_FILE = join(process.cwd(), '.react-compiler-tracker.json');
const COMPILER_OUTPUT_FILE = join(process.cwd(), 'react-compiler-output.json');

class ReactCompilerTracker {
    private trackerData: TrackerData;

    constructor() {
        this.trackerData = this.loadTrackerData();
    }

    private loadTrackerData(): TrackerData {
        if (existsSync(TRACKER_FILE)) {
            try {
                return JSON.parse(readFileSync(TRACKER_FILE, 'utf8'));
            } catch (error) {
                console.warn('Failed to parse tracker file, starting fresh:', error);
            }
        }

        return {
            components: {},
            lastFullCheck: '',
            version: '1.0.0',
        };
    }

    private saveTrackerData(): void {
        writeFileSync(TRACKER_FILE, JSON.stringify(this.trackerData, null, 2));
    }

    private runCompilerHealthcheck(): CompilerResults {
        try {
            console.log('🔍 Running React Compiler healthcheck...');
            const output = execSync('npx react-compiler-healthcheck --json', {
                encoding: 'utf8',
                cwd: process.cwd(),
            });

            // Save raw output for debugging
            writeFileSync(COMPILER_OUTPUT_FILE, output);

            return JSON.parse(output);
        } catch (error) {
            console.error('❌ Failed to run React Compiler healthcheck:', error);
            throw error;
        }
    }

    private updateComponentStatus(file: string, canCompile: boolean): void {
        this.trackerData.components[file] = {
            file,
            canCompile,
            lastChecked: new Date().toISOString(),
        };
    }

    private getChangedFiles(): string[] {
        try {
            // Get files changed in the current branch/commit
            const output = execSync('git diff --name-only --diff-filter=AMR HEAD~1 HEAD', {
                encoding: 'utf8',
            });
            return output
                .trim()
                .split('\n')
                .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'));
        } catch (error) {
            console.warn('Could not determine changed files:', error);
            return [];
        }
    }

    private getNewFiles(): string[] {
        try {
            // Get files that are new (not in main branch)
            const output = execSync('git diff --name-only --diff-filter=A origin/main...HEAD', {
                encoding: 'utf8',
            });
            return output
                .trim()
                .split('\n')
                .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'));
        } catch (error) {
            console.warn('Could not determine new files:', error);
            return [];
        }
    }

    public async runFullCheck(): Promise<void> {
        console.log('🚀 Running full React Compiler check...');

        const results = this.runCompilerHealthcheck();
        const now = new Date().toISOString();

        // Update all component statuses
        results.success.forEach((file) => {
            this.updateComponentStatus(file, true);
        });

        results.failure.forEach((file) => {
            this.updateComponentStatus(file, false);
        });

        this.trackerData.lastFullCheck = now;
        this.saveTrackerData();

        console.log(`✅ Full check completed. Found ${results.success.length} compilable and ${results.failure.length} non-compilable components.`);
    }

    public async checkChangedFiles(): Promise<{passed: boolean; failures: string[]}> {
        console.log('🔍 Checking changed files for React Compiler compliance...');

        const changedFiles = this.getChangedFiles();
        const newFiles = this.getNewFiles();
        const filesToCheck = [...new Set([...changedFiles, ...newFiles])];

        if (filesToCheck.length === 0) {
            console.log('✅ No React files changed, skipping check.');
            return {passed: true, failures: []};
        }

        console.log(`📝 Checking ${filesToCheck.length} changed files...`);

        const results = this.runCompilerHealthcheck();
        const failures: string[] = [];

        // Check each changed file
        for (const file of filesToCheck) {
            const canCompile = results.success.includes(file);
            const isNewFile = newFiles.includes(file);

            this.updateComponentStatus(file, canCompile);

            // For new files, they must be compilable
            if (isNewFile && !canCompile) {
                failures.push(file);
                console.log(`❌ New file ${file} cannot be compiled by React Compiler`);
            } else if (canCompile) {
                console.log(`✅ ${file} can be compiled by React Compiler`);
            } else {
                console.log(`⚠️  ${file} cannot be compiled by React Compiler (existing file)`);
            }
        }

        this.saveTrackerData();

        const passed = failures.length === 0;
        if (passed) {
            console.log('✅ All changed files pass React Compiler compliance check!');
        } else {
            console.log(`❌ ${failures.length} new files fail React Compiler compliance check.`);
        }

        return {passed, failures};
    }

    public checkSpecificFile(filePath: string): boolean {
        console.log(`🔍 Checking specific file: ${filePath}`);

        const results = this.runCompilerHealthcheck();
        const canCompile = results.success.includes(filePath);

        this.updateComponentStatus(filePath, canCompile);
        this.saveTrackerData();

        if (canCompile) {
            console.log(`✅ ${filePath} can be compiled by React Compiler`);
        } else {
            console.log(`❌ ${filePath} cannot be compiled by React Compiler`);
        }

        return canCompile;
    }

    public getStatus(): void {
        console.log('📊 React Compiler Tracker Status:');
        console.log(`Last full check: ${this.trackerData.lastFullCheck || 'Never'}`);
        console.log(`Total tracked components: ${Object.keys(this.trackerData.components).length}`);

        const compilable = Object.values(this.trackerData.components).filter((c) => c.canCompile).length;
        const nonCompilable = Object.values(this.trackerData.components).filter((c) => !c.canCompile).length;

        console.log(`Compilable: ${compilable}`);
        console.log(`Non-compilable: ${nonCompilable}`);

        if (nonCompilable > 0) {
            console.log('\n❌ Non-compilable components:');
            Object.values(this.trackerData.components)
                .filter((c) => !c.canCompile)
                .forEach((c) => console.log(`  - ${c.file} (last checked: ${c.lastChecked})`));
        }
    }

    public generateReport(): void {
        const results = this.runCompilerHealthcheck();

        console.log('\n📋 React Compiler Report:');
        console.log(`✅ Successfully compiled: ${results.success.length} components`);
        console.log(`❌ Failed to compile: ${results.failure.length} components`);

        if (results.failure.length > 0) {
            console.log('\n❌ Failed components:');
            results.failure.forEach((file) => console.log(`  - ${file}`));
        }

        // Save detailed report
        const reportFile = join(process.cwd(), 'react-compiler-report.json');
        writeFileSync(
            reportFile,
            JSON.stringify(
                {
                    timestamp: new Date().toISOString(),
                    summary: {
                        total: results.success.length + results.failure.length,
                        success: results.success.length,
                        failure: results.failure.length,
                    },
                    success: results.success,
                    failure: results.failure,
                },
                null,
                2,
            ),
        );

        console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const tracker = new ReactCompilerTracker();

    try {
        switch (command) {
            case 'full-check':
                await tracker.runFullCheck();
                break;

            case 'check-changed':
                const result = await tracker.checkChangedFiles();
                if (!result.passed) {
                    console.log('\n❌ CI Check Failed!');
                    console.log('The following new files cannot be compiled by React Compiler:');
                    result.failures.forEach((file) => console.log(`  - ${file}`));
                    console.log('\nPlease fix these files to follow the Rules of React.');
                    process.exit(1);
                }
                break;

            case 'check-file':
                const filePath = args[1];
                if (!filePath) {
                    console.error('❌ Please provide a file path: npm run react-compiler-tracker check-file <path>');
                    process.exit(1);
                }
                const canCompile = tracker.checkSpecificFile(filePath);
                process.exit(canCompile ? 0 : 1);
                break;

            case 'status':
                tracker.getStatus();
                break;

            case 'report':
                tracker.generateReport();
                break;

            default:
                console.log(`
🔧 React Compiler Tracker

Usage:
  npm run react-compiler-tracker <command> [options]

Commands:
  full-check     Run a full check of all components
  check-changed  Check only changed files (for CI)
  check-file     Check a specific file
  status         Show current tracker status
  report         Generate a detailed report

Examples:
  npm run react-compiler-tracker full-check
  npm run react-compiler-tracker check-changed
  npm run react-compiler-tracker check-file src/components/MyComponent.tsx
  npm run react-compiler-tracker status
  npm run react-compiler-tracker report
        `);
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export {ReactCompilerTracker};
