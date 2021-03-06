"use strict";

/**
 * Text bitmap atlas with support for signed distance field data.
 *
 * Input data should be composed of a BMFont file (can be a .fnt, .json. etc) file and a character atlas texture from an image.
 *
 * Font atlas can be generate using the tool http://www.angelcode.com/products/bmfont/
 *
 * Based on the three-bmfont-text library.
 *  - https://github.com/Jam3/three-bmfont-text
 *  - https://github.com/Jam3/load-bmfont
 *
 * @class TextBitmap
 * @extends {THREE.Mesh}
 * @param {Object} config Configuration object with all parameters for bmfont.
 * @param {THREE.Texture} texture Texture with the image character atlas to be used.
 * @param {Number} mode The text rendering mode to be used (Bitmap, SDF, MSDF).
 * @param {Number} color Color of the text.
 */
function TextBitmap(config, texture, mode, color)
{
	if(config.font === undefined)
	{
		throw new Error("TextBitmap configuration font is required.");
	}

	if(config.width === undefined)
	{
		config.width = 500;
	}
	if(config.align === undefined)
	{
		config.align = TextBitmap.CENTER;
	}
	if(config.lineHeight === undefined)
	{
		config.lineHeight = config.font.common.lineHeight;
	}
	if(config.letterSpacing === undefined)
	{
		config.letterSpacing = 5;
	}
	if(config.text === undefined)
	{
		config.text = "";
	}

	/**
	 * BMFont text configuration object.
	 *
	 * Passed to the BMFont text geometry generator. It is a object with the format.
	 *
	 * {
	 *    font: (Object) Font data should be parsed from (.json, .fnt, etc) file,
	 *    text: (String),
	 *    width: (Number) Width of the text area,
	 *    align: (String) Side to align the text,
	 *    lineHeight: (Number) Line height/font size,
	 *    letterSpacing: (Number) Spacing between characters,
	 *    mode: (String) a mode for word-wrapper; can be 'pre' (maintain spacing), or 'nowrap' (collapse whitespace but only break on newline characters), otherwise assumes normal word-wrap behaviour (collapse whitespace, break at width or newlines)
	 *    tabSize: (Number) the number of spaces to use in a single tab (default 4)
	 *    start: (Number) the starting index into the text to layout (default 0)
	 *    end: (Number) the ending index (exclusive) into the text to layout (default text.length)
	 * }
	 *
	 * @attribute config
	 * @type {Object}
	 */
	this.config = config;

	/**
	 * Text bitmap rendering mode, can be:
	 *    - TextBitmap.BITMAP 
	 *    - TextBitmap.SDF 
	 *    - TextBitmap.MSDF 
	 *
	 * @attribute mode
	 * @type {Number}
	 */
	this.mode = mode !== undefined ? mode : TextBitmap.BITMAP;

	var shader = this.mode === TextBitmap.SDF ? TextBitmap.SDF_SHADER : this.mode === TextBitmap.MSDF ? TextBitmap.MSDF_SHADER : TextBitmap.BITMAP_SHADER;
	var uniforms = 
	{
		map: {type: "t", value: texture},
		color: {type: "v3", value: new THREE.Color(color !== undefined ? color : 0xFFFFFF)},
		smoothing: {type: "f", value: 0.0},
		threshold: {type: "f", value: 0.4}
	};

	var material = new THREE.ShaderMaterial(
	{
		uniforms: THREE.UniformsUtils.clone(uniforms),
		fragmentShader: shader,
		vertexShader: TextBitmap.VERTEX_SHADER,
		side: THREE.DoubleSide,
		transparent: true,
		depthTest: false
	});
	material.uniforms.map.value = texture;

	var geometry = createGeometry(this.config);

	THREE.Mesh.call(this, geometry, material);

	this.name = "text";
	this.type = "TextBitmap";

	this.updateGeometry();

	Object.defineProperties(this,
	{
		/**
		 * BMFont text font data, contains the data about all characters available, and their position in the atlas.
		 *
		 * Font data should be parsed from (.json, .fnt, etc) file.
		 *
		 * Passed to the BMFont text geometry generator.
		 *
		 * @attribute font
		 * @type {Object}
		 */
		font: 
		{
			get: function(){return this.config.font;},
			set: function(value){this.config.font = value; this.updateGeometry();}
		},

		/** 
		 * Text displayed on the object.
		 *
		 * @attribute text
		 * @type {String}
		 */
		text:
		{
			get: function(){return this.config.text;},
			set: function(value){this.config.text = value; this.updateGeometry();}
		},

		/**
		 * Space between each text line.
		 *
		 * @attribute lineHeight
		 * @type {Number}
		 */
		lineHeight:
		{
			get: function(){return this.config.lineHeight;},
			set: function(value){this.config.lineHeight = value; this.updateGeometry();}
		},
		
		/**
		 * Spacing between each letter.
		 *
		 * @attribute letterSpacing
		 * @type {Number}
		 */
		letterSpacing:
		{
			get: function(){return this.config.letterSpacing;},
			set: function(value){this.config.letterSpacing = value; this.updateGeometry();}
		},

		/**
		 * Horizontal text alignment can be
		 *    - TextBitmap.LEFT
		 *    - TextBitmap.RIGHT
		 *    - TextBitmap.CENTER
		 *
		 * @attribute align
		 * @type {String}
		 */
		align:
		{
			get: function(){return this.config.align;},
			set: function(value){this.config.align = value; this.updateGeometry();}
		},

		/** 
		 * Width of the text box.
		 *
		 * @attribute width
		 * @type {Number}
		 */
		width:
		{
			get: function(){return this.config.width;},
			set: function(value){this.config.width = value; this.updateGeometry();}
		},

		/** 
		 * Color of the text, only applied for SDF and MSDF modes.
		 *
		 * @attribute color
		 * @type {THREE.Color}
		 */
		color:
		{
			get: function(){return this.material.uniforms.color.value;},
			set: function(value){this.material.uniforms.color.value = value;}
		},

		/** 
		 * SDF distance alpha threshold.
		 *
		 * @attribute threshold
		 * @type {THREE.Color}
		 */
		threshold: 
		{
			get: function(){return this.material.uniforms.threshold.value;},
			set: function(value){this.material.uniforms.threshold.value = value;}
		},

		/** 
		 * Smoothing of the text borders.
		 *
		 * @attribute smoothing
		 * @type {Number}
		 */
		smoothing:
		{
			get: function(){return this.material.uniforms.smoothing.value;},
			set: function(value){this.material.uniforms.smoothing.value = value;}
		}
	});
}

TextBitmap.prototype = Object.create(THREE.Mesh.prototype);
TextBitmap.prototype.constructor = TextBitmap;

/**
 * Simple bitmap font atlas.
 *
 * @static
 * @attribute BITMAP
 * @type {Number}
 */
TextBitmap.BITMAP = 100;

/**
 * Single channel signed distance field font atlas.
 *
 * @static
 * @attribute SDF
 * @type {Number}
 */
TextBitmap.SDF = 101;

/**
 * Multi channel signed distance field font atlas.
 *
 * @static
 * @attribute MSDF
 * @type {Number}
 */
TextBitmap.MSDF = 102;

/**
 * Align text to the left side.
 *
 * @static
 * @attribute LEFT
 * @type {String}
 */
TextBitmap.LEFT = "left";

/**
 * Align text to the center.
 *
 * @static
 * @attribute CENTER
 * @type {String}
 */
TextBitmap.CENTER = "center";

/**
 * Align text to the right side.
 *
 * @static
 * @attribute RIGHT
 * @type {String}
 */
TextBitmap.RIGHT = "right";

/**
 * Vertex shader used to draw the text, is responsible for applying the billboard effect by removing the rotation from the transformation matrix.
 *
 * @static
 * @attribute VERTEX_SHADER
 * @type {String}
 */
TextBitmap.VERTEX_SHADER = "\n\
#define BILLBOARD 0 \n\
\n\
varying vec2 vUv;\n\
\n\
void main()\n\
{\n\
	vUv = uv;\n\
	\n\
	#if BILLBOARD\n\
		mat4 model = modelViewMatrix; \n\
		model[0][0] = 1.0;\n\
		model[0][1] = 0.0;\n\
		model[0][2] = 0.0;\n\
		\n\
		model[1][0] = 0.0;\n\
		model[1][1] = 1.0;\n\
		model[1][2] = 0.0;\n\
		\n\
		model[2][0] = 0.0;\n\
		model[2][1] = 0.0;\n\
		model[2][2] = 1.0;\n\
		\n\
		gl_Position = projectionMatrix * model * vec4(position, 1.0);\n\
	#else\n\
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n\
	#endif\n\
	\n\
}";


/**
 * Shader object used to render the bitmap directly without any processing.
 *
 * Contains only the fragment shader code, the vertex is the same for every render mode.
 *
 * @static
 * @attribute BITMAP_SHADER
 * @type {String}
 */
TextBitmap.BITMAP_SHADER = "\n\
varying vec2 vUv;\n\
uniform sampler2D map;\n\
\n\
void main()\n\
{\n\
	gl_FragColor = texture2D(map, vUv);\n\
}";

/**
 * Shader object used to render single channel SDF data.
 *
 * Contains only the fragment shader code, the vertex is the same for every render mode.
 * 
 * Details about signed distance fields for vetorial shapes rendering.
 *    - https://steamcdn-a.akamaihd.net/apps/valve/2007/SIGGRAPH2007_AlphaTestedMagnification.pdf
 *
 * @static
 * @attribute SDF_SHADER
 * @type {String}
 */
TextBitmap.SDF_SHADER = "\n\
varying vec2 vUv;\n\
uniform sampler2D map;\n\
uniform vec3 color;\n\
uniform float smoothing;\n\
uniform float threshold;\n\
\n\
void main()\n\
{\n\
	float distance = texture2D(map, vUv).a;\n\
	float alpha = smoothstep(threshold - smoothing, threshold + smoothing, distance);\n\
	gl_FragColor = vec4(color, alpha);\n\
}";

/**
 * Shader object used to render single channel MSDF data.
 *
 * Contains only the fragment shader code, the vertex is the same for every render mode.
 * 
 * Details about Multi‐Channel Signed Distance Fields for vetorial shapes rendering.
 *    - https://onlinelibrary.wiley.com/doi/full/10.1111/cgf.13265
 *
 * @static
 * @attribute SDF_SHADER
 * @type {String}
 */
TextBitmap.MSDF_SHADER = "\n\
#extension GL_OES_standard_derivatives : enable\n\
\n\
varying vec2 vUv;\n\
uniform sampler2D map;\n\
uniform vec3 color;\n\
uniform float smoothing;\n\
uniform float threshold;\n\
\n\
float median(float r, float g, float b)\n\
{\n\
	return max(min(r, g), min(max(r, g), b));\n\
}\n\
\n\
void main()\n\
{\n\
	vec3 sample = texture2D(map, vUv).rgb;\n\
	float sigDist = median(sample.r, sample.g, sample.b) - 0.5;\n\
	float alpha = clamp(sigDist / fwidth(sigDist) + 0.5, 0.0, 1.0);\n\
	gl_FragColor = vec4(color, 1.0 - alpha);\n\
}";

/**
 * Set the text to be displayed.
 *
 * @method setText
 * @param {String} text
 */
TextBitmap.prototype.setText = function(text)
{
	this.text = text;
};

/**
 * Update the text bitmap geometry.
 *
 * Should be called every time after changes to configuration are made.
 *
 * @method updateGeometry
 */
TextBitmap.prototype.updateGeometry = function()
{
	//Update BMFont geometry to match config
	this.geometry.update(this.config);
};
