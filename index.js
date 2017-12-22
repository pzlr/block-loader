'use strict';

const
	$C = require('collection.js'),
	path = require('path'),
	core = require('@pzlr/build-core'),
	loaderUtils = require('loader-utils');

const preferences = {
	static: ['.ess', '.styl'],
	ts: ['.ess', '.ss', '.styl', '.ts'],
	js: ['.ess', '.ss', '.styl', '.js']
};

const scripts = {
	'.ts': true,
	'.js': true
};

/**
 * Returns escaped path
 * (fix for windows)
 *
 * @param {string} path
 * @returns {string}
 */
function escapePath(path) {
	return JSON.stringify(path).slice(1, -1);
}

/**
 * @param source
 * @returns {string}
 */
module.exports = async function (source) {
	const
		cb = this.async();

	/**
	 * @type {{
	 *   projectType?: string,
	 *   exts?: Array<string>,
	 *   libs?: boolean
	 * }}
	 */
	const query = loaderUtils.getOptions(this) || {};

	const
		projectType = query.projectType || core.config.projectType,
		fileExts = query.exts || preferences[projectType],
		requireLibs = 'libs' in query ? query.libs : true,
		declaration = core.declaration.parse(source, true);

	if (!declaration) {
		return source;
	}

	this.addContextDependency(this.context);

	const
		{name, type, parent, dependencies, libs} = declaration;

	try {
		let res = parent ?
			`require('${await core.resolve.block(parent)}');\n` : '';

		res += (
			await $C(dependencies)
				.parallel()
				.map(async (dep) => `require('${await core.resolve.block(dep, name)}');`)

		).join('\n');

		if (requireLibs) {
			res += libs.map((lib) => `require('${escapePath(lib)}');`)
				.join('\n');
		}

		res += '\n';
		await $C(fileExts)
			.parallel()
			.forEach(async (ext) => {
				if (scripts[ext] || type !== 'interface') {
					const
						file = await core.resolve.block(path.join(name, path.basename(name) + ext));

					if (file) {
						res += `require('${file}');\n`;
					}
				}
			});

		cb(null, res);

	} catch (err) {
		cb(err);
	}
};
