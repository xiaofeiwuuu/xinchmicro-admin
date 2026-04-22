const webpack = require('webpack')

module.exports = {
	runtimeCompiler: true,

	chainWebpack: config => {
		config
			.plugin('html')
			.tap(args => {
				args[0].title = '后台管理'
				return args
			})

		// 移除 moment 多余的语言包，只保留中文
		config
			.plugin('ignore')
			.use(webpack.IgnorePlugin, [{
				resourceRegExp: /^\.\/locale$/,
				contextRegExp: /moment$/
			}])
	},

	configureWebpack: {
		optimization: {
			splitChunks: {
				chunks: 'all',
				cacheGroups: {
					// ant-design-vue 单独打包
					antd: {
						name: 'chunk-antd',
						test: /[\\/]node_modules[\\/]ant-design-vue[\\/]/,
						priority: 20,
					},
					// chart.js 单独打包
					chart: {
						name: 'chunk-chart',
						test: /[\\/]node_modules[\\/]chart\.js[\\/]/,
						priority: 15,
					},
					// 其他 vendors
					vendors: {
						name: 'chunk-vendors',
						test: /[\\/]node_modules[\\/]/,
						priority: 10,
						chunks: 'initial',
					},
					// 公共模块
					common: {
						name: 'chunk-common',
						minChunks: 2,
						priority: 5,
						chunks: 'initial',
						reuseExistingChunk: true,
					}
				}
			}
		}
	},

	publicPath: '/',
	productionSourceMap: false,
	assetsDir: 'static',
	outputDir: 'dist',
}
