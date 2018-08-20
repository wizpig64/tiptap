import path from 'path'
import webpack from 'webpack'
import { VueLoaderPlugin } from 'vue-loader'
import SvgStore from 'webpack-svgstore-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ManifestPlugin from 'webpack-manifest-plugin'
import ImageminWebpackPlugin from 'imagemin-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import OptimizeCssAssetsPlugin from 'optimize-css-assets-webpack-plugin'
import { ifDev, ifProd, removeEmpty } from './utilities'
import { rootPath, srcPath, buildPath } from './paths'

export default {

	mode: ifDev('development', 'production'),

	entry: {
		app: removeEmpty([
			ifDev('webpack-hot-middleware/client?reload=true'),
			`${srcPath}/assets/sass/main.scss`,
			`${srcPath}/main.js`,
		]),
	},

	output: {
		path: `${buildPath}/`,
		filename: `assets/js/[name]${ifProd('.[hash]', '')}.js`,
		chunkFilename: `assets/js/[name]${ifProd('.[chunkhash]', '')}.js`,
		publicPath: '/',
	},

	resolve: {
		extensions: ['.js', '.scss', '.vue'],
		alias: {
			vue$: 'vue/dist/vue.esm.js',
			modernizr: path.resolve(rootPath, '../.modernizr'),
			modules: path.resolve(rootPath, '../node_modules'),
			images: `${srcPath}/assets/images`,
			fonts: `${srcPath}/assets/fonts`,
			variables: `${srcPath}/assets/sass/variables`,
			settings: `${srcPath}/assets/sass/1-settings/index`,
			utilityFunctions: `${srcPath}/assets/sass/2-utility-functions/index`,
			'vue-mirror': path.resolve(rootPath, '../src'),
		},
		modules: [
			srcPath,
			path.resolve(rootPath, '../node_modules'),
		],
	},

	devtool: ifDev('eval-source-map', 'source-map'),

	module: {
		rules: [
			{
				test: /\.modernizr$/,
				loader: 'modernizr-loader',
			},
			{
				test: /\.vue$/,
				loader: 'vue-loader',
			},
			{
				test: /\.js$/,
				loader: ifDev('babel-loader?cacheDirectory=true', 'babel-loader'),
				exclude: /node_modules(?!\/quill)/,
			},
			{
				test: /\.(graphql|gql)$/,
				loader: 'graphql-tag/loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: removeEmpty([
					ifDev('vue-style-loader', MiniCssExtractPlugin.loader),
					'css-loader',
					'postcss-loader',
				]),
			},
			{
				test: /\.scss$/,
				use: removeEmpty([
					ifDev('vue-style-loader', MiniCssExtractPlugin.loader),
					'css-loader',
					'postcss-loader',
					'sass-loader',
				]),
			},
			{
				test: /\.(png|jpe?g|gif|svg|ico)(\?.*)?$/,
				use: {
					loader: 'file-loader',
					options: {
						name: `assets/images/[name]${ifProd('.[hash]', '')}.[ext]`,
					},
				},
			},
			{
				test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
				use: {
					loader: 'file-loader',
					options: {
						name: `assets/fonts/[name]${ifProd('.[hash]', '')}.[ext]`,
					},
				},
			},
		],
	},

	// splitting out the vendor
	optimization: {
		namedModules: true,
		splitChunks: {
			name: 'vendor',
			minChunks: 2,
		},
		noEmitOnErrors: true,
		// concatenateModules: true,
	},

	plugins: removeEmpty([

		// create manifest file for server-side asset manipulation
		new ManifestPlugin({
			fileName: 'assets/manifest.json',
			writeToFileEmit: true,
		}),

		// define env
		new webpack.DefinePlugin({
			'process.env': {
				API_BASEURL: ifDev(
					JSON.stringify('http://local.app.scrumpy.io/api/'),
					JSON.stringify('https://app.scrumpy.io/api/'),
				),
				SOCKET_KEY: ifDev(
					JSON.stringify('981d87f7695904cec025e4039dd4048b'),
					JSON.stringify('981d87f7695904cec025e4039dd4048b'),
				),
				SOCKET_HOST: ifDev(
					JSON.stringify('http://local.socket.scrumpy.io/'),
					JSON.stringify('https://socket.scrumpy.io/'),
				),
				SUBSCRIPTIONS_HOST: ifDev(
					JSON.stringify('ws://local.subscriptions.scrumpy.io/'),
					JSON.stringify('wss://subscriptions.scrumpy.io/'),
				),
				STRIPE_KEY: ifDev(
					JSON.stringify('pk_test_yU17swZxi2a289XgEI9F20qS'),
					JSON.stringify('pk_live_XWgEzw9TgxpY8Tsf7PKXzk1k'),
				),
				CRISP_WEBSITE_ID: ifDev(
					null,
					JSON.stringify('463813ad-c274-4da1-8045-f5ceac88832b'),
				),
				ANALYTICS_ID: ifDev(
					null,
					JSON.stringify('UA-93829826-2'),
				),
				BUILD_VERSION: JSON.stringify(new Date().valueOf()),
			},
		}),

		// copy static files
		new CopyWebpackPlugin([
			{
				context: `${srcPath}/assets/static`,
				from: { glob: '**/*', dot: false },
				to: `${buildPath}/assets`,
			},
		]),

		// enable hot reloading
		ifDev(new webpack.HotModuleReplacementPlugin()),

		// make some packages available everywhere
		new webpack.ProvidePlugin({
			// $: 'jquery',
			// jQuery: 'jquery',
			// 'window.jQuery': 'jquery',
			collect: 'collect.js',
		}),

		// html
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: `${srcPath}/index.html`,
			inject: true,
			minify: ifProd({
				removeComments: true,
				collapseWhitespace: true,
				removeAttributeQuotes: true,
			}),
			buildVersion: new Date().valueOf(),
			chunksSortMode: 'none',
		}),

		new VueLoaderPlugin(),

		// create css files
		ifProd(new MiniCssExtractPlugin({
			filename: `assets/css/[name]${ifProd('.[hash]', '')}.css`,
			chunkFilename: `assets/css/[name]${ifProd('.[hash]', '')}.css`,
		})),

		// minify css files
		ifProd(new OptimizeCssAssetsPlugin({
			cssProcessorOptions: {
				reduceIdents: false,
				autoprefixer: false,
				zindex: false,
				discardComments: {
					removeAll: true,
				},
			},
		})),

		// svg icons
		new SvgStore({
			prefix: 'icon--',
			svgoOptions: {
				plugins: [
					{ cleanupIDs: false },
					{ collapseGroups: false },
					{ removeTitle: true },
				],
			},
		}),

		// image optimization
		new ImageminWebpackPlugin({
			optipng: ifDev(null, {
				optimizationLevel: 3,
			}),
			jpegtran: ifDev(null, {
				progressive: true,
				quality: 80,
			}),
			svgo: ifDev(null, {
				plugins: [
					{ cleanupIDs: false },
					{ removeViewBox: false },
					{ removeUselessStrokeAndFill: false },
					{ removeEmptyAttrs: false },
				],
			}),
		}),

	]),

	node: {
		fs: 'empty',
	},

}