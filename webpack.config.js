const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
  return {
    mode: env.production ? "production" : "development",
    resolve: {
      modules: [path.resolve(__dirname, "src"), "node_modules"],
      roots: [__dirname, path.resolve(__dirname, "src")],
    },
    entry: {
      popup: "./src/popup/popup.js",
      options: "./src/options/options.js",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
    },
    devtool: env.production ? false : "inline-source-map",
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin(),
      new CopyPlugin({
        patterns: [{ from: "./src/manifest.json" }],
      }),
      new HtmlWebpackPlugin({
        template: "./src/popup/popup.html",
        filename: "popup.html",
        chunks: ["popup"],
      }),
      new HtmlWebpackPlugin({
        template: "./src/options/options.html",
        filename: "options.html",
        chunks: ["options"],
      }),
    ],
  };
};
