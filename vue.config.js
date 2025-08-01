module.exports = {
	runtimeCompiler: true,

	chainWebpack: config => {
		config
			.plugin('html')
			.tap(args => {
				args[0].title = '后台管理'
				return args
			})
	},

	// devServer: {
	// 	proxy: {
	// 		'/api': {
	// 			// target: 'http://165.154.236.163:40003',
	// 			target: 'https://emenu.scszyy.cn/backend',
	// 			changeOrigin: true,
	// 			// pathRewrite: { '^/api': '' },
	// 		},
	// 	},
	// },

	publicPath: '/',
	productionSourceMap: false,
	assetsDir: 'static',
	outputDir: 'dist',
}
