/* eslint-disable @typescript-eslint/naming-convention */
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import path from 'path';
import portfinder from 'portfinder';
import {TimeAnalyticsPlugin} from 'time-analytics-webpack-plugin';
import type {Configuration} from 'webpack';
import {DefinePlugin} from 'webpack';
import type {Configuration as DevServerConfiguration} from 'webpack-dev-server';
import {merge} from 'webpack-merge';
import type Environment from './types';
import getCommonConfiguration from './webpack.common';

const BASE_PORT = 8082;

/**
 * Configuration for the local dev server
 */
const getConfiguration = (environment: Environment): Promise<Configuration> =>
    portfinder.getPortPromise({port: BASE_PORT}).then((port) => {
        // Check if the USE_WEB_PROXY variable has been provided
        // and rewrite any requests to the local proxy server
        const proxySettings: Pick<DevServerConfiguration, 'proxy'> =
            process.env.USE_WEB_PROXY === 'false'
                ? {}
                : {
                      proxy: [
                          {
                              context: ['/api', '/staging', '/chat-attachments', '/receipts'],
                              target: 'http://[::1]:9000',
                          },
                      ],
                  };

        const baseConfig = getCommonConfiguration(environment);

        const config = merge(baseConfig, {
            mode: 'development',
            devtool: 'eval-source-map',
            devServer: {
                static: {
                    directory: path.join(__dirname, '../../dist'),
                },
                client: {
                    overlay: false,
                },
                hot: true,
                ...proxySettings,
                historyApiFallback: true,
                port,
                host: 'dev.new.expensify.com',
                server: {
                    type: 'https',
                    options: {
                        key: path.join(__dirname, 'key.pem'),
                        cert: path.join(__dirname, 'certificate.pem'),
                    },
                },
                headers: {
                    'Document-Policy': 'js-profiling',
                },
            },
            plugins: [
                new DefinePlugin({
                    'process.env.PORT': port,
                    'process.env.NODE_ENV': JSON.stringify('development'),
                }),
                new ReactRefreshWebpackPlugin({overlay: {sockProtocol: 'wss'}}),
                // Custom plugin to force garbage collection every 5 compilations
                {
                    apply(compiler) {
                        let compilationCount = 0;
                        if (gc && typeof gc === 'function') {
                            compiler.hooks.done.tap('ForceGCEvery5Compilations', () => {
                                compilationCount++;
                                
                                // Log memory usage every compilation
                                const memUsage = process.memoryUsage();
                                const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
                                const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
                                
                                // eslint-disable-next-line no-console
                                console.log(`📊 Compilation #${compilationCount} - Heap: ${heapUsedMB}MB/${heapTotalMB}MB`);
                                
                                if (compilationCount % 5 === 0) {
                                    // eslint-disable-next-line no-console
                                    console.log(`🗑️  Forcing garbage collection after ${compilationCount} compilations`);
                                    // @ts-expect-error - gc is a global function provided by Node.js when --expose-gc is used
                                    gc();
                                    
                                    // Log memory after GC
                                    const memAfterGC = process.memoryUsage();
                                    const heapAfterMB = Math.round(memAfterGC.heapUsed / 1024 / 1024);
                                    // eslint-disable-next-line no-console
                                    console.log(`✅ Post-GC heap: ${heapAfterMB}MB (freed ${heapUsedMB - heapAfterMB}MB)`);
                                }
                            });
                        }
                    },
                },
            ],
            // This prevents import error coming from react-native-tab-view/lib/module/TabView.js
            // where Pager is imported without extension due to having platform-specific implementations
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        resolve: {
                            fullySpecified: false,
                        },
                        include: [path.resolve(__dirname, '../../node_modules/react-native-tab-view/lib/module/TabView.js')],
                    },
                ],
            },
            cache: {
                type: 'filesystem',
                name: environment.platform ?? 'default',
                buildDependencies: {
                    // By default, webpack and loaders are build dependencies
                    // This (also) makes all dependencies of this config file - build dependencies
                    config: [__filename],
                },
            },
            snapshot: {
                // A list of paths webpack trusts would not be modified while webpack is running
                managedPaths: [
                    // Onyx and react-native-live-markdown can be modified on the fly, changes to other node_modules would not be reflected live
                    /([\\/]node_modules[\\/](?!react-native-onyx|@expensify\/react-native-live-markdown))/,
                ],
            },
        });

        return TimeAnalyticsPlugin.wrap(config, {plugin: {exclude: ['ReactRefreshPlugin']}});
    });

export default getConfiguration;
