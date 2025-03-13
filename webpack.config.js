const path = require('path');

module.exports = {
    // Change to 'development' during development to enable more verbose output
    mode: 'production',
    // Entry point for your extension's popup code
    entry: './src/popup.js',
    // Output configuration for the bundled file
    output: {
        filename: 'bundle.js', // Name of the bundled file
        path: path.resolve(__dirname, 'dist'), // Output folder is 'dist'
    },
    // Module rules for handling different file types
    module: {
        rules: [
            {
                // This rule applies to .js or .mjs files
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    // Use Babel loader to transpile modern JavaScript
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'], // Use preset-env for compatibility
                    },
                },
            },
        ],
    },
    // Resolve JavaScript file extensions
    resolve: {
        extensions: ['.js'],
    },
};
