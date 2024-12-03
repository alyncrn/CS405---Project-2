/**
 * @Instructions
 * 		@task1 : Complete the setTexture function to handle non power of 2 sized textures
 * 		@task2 : Implement the lighting by modifying the fragment shader, constructor,
 *      @task3: 
 *      @task4: 
 * 		setMesh, draw, setAmbientLight, setSpecularLight and enableLighting functions 
 */


function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	
	var trans1 = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	var rotatXCos = Math.cos(rotationX);
	var rotatXSin = Math.sin(rotationX);

	var rotatYCos = Math.cos(rotationY);
	var rotatYSin = Math.sin(rotationY);

	var rotatx = [
		1, 0, 0, 0,
		0, rotatXCos, -rotatXSin, 0,
		0, rotatXSin, rotatXCos, 0,
		0, 0, 0, 1
	]

	var rotaty = [
		rotatYCos, 0, -rotatYSin, 0,
		0, 1, 0, 0,
		rotatYSin, 0, rotatYCos, 0,
		0, 0, 0, 1
	]

	var test1 = MatrixMult(rotaty, rotatx);
	var test2 = MatrixMult(trans1, test1);
	var mvp = MatrixMult(projectionMatrix, test2);

	return mvp;
}


class MeshDrawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor() {
		this.prog = InitShaderProgram(meshVS, meshFS);
	
		//uniform locations
		this.mvpLoc = gl.getUniformLocation(this.prog, 'mvp');
		this.showTexLoc = gl.getUniformLocation(this.prog, 'showTex');
		this.lightPosLoc = gl.getUniformLocation(this.prog, 'lightPos');
		this.ambientLoc = gl.getUniformLocation(this.prog, 'ambient');
		this.colorLoc = gl.getUniformLocation(this.prog, 'color');
		this.enableLightLoc = gl.getUniformLocation(this.prog, 'enableLighting');
		this.specularIntensityLoc = gl.getUniformLocation(this.prog, 'specularIntensity');
		this.shininessLoc = gl.getUniformLocation(this.prog, 'shininess');
		this.viewDirLoc = gl.getUniformLocation(this.prog, 'viewDir');
		this.tex2Loc = gl.getUniformLocation(this.prog, 'tex2');
		this.blendFactorLoc = gl.getUniformLocation(this.prog, 'blendFactor');

	
		//attributes
		this.vertPosLoc = gl.getAttribLocation(this.prog, 'pos');
		this.texCoordLoc = gl.getAttribLocation(this.prog, 'texCoord');
		this.normalLoc = gl.getAttribLocation(this.prog, 'normal');
	
		//buffers
		this.vertbuffer = gl.createBuffer();
		this.texbuffer = gl.createBuffer();
		this.normbuffer = null;
	
		this.numTriangles = 0;
	}
	

	setMesh(vertPos, texCoords, normalCoords) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	
		// update texture coordinates
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	
		if (normalCoords) {
			this.normbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalCoords), gl.STATIC_DRAW);
		}
	
		this.numTriangles = vertPos.length / 3;
	}
	

	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw(trans) {
		gl.useProgram(this.prog);

		gl.uniformMatrix4fv(this.mvpLoc, false, trans);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.enableVertexAttribArray(this.vertPosLoc);
		gl.vertexAttribPointer(this.vertPosLoc, 3, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
		gl.enableVertexAttribArray(this.texCoordLoc);
		gl.vertexAttribPointer(this.texCoordLoc, 2, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
		gl.enableVertexAttribArray(this.normalLoc);
		gl.vertexAttribPointer(this.normalLoc, 3, gl.FLOAT, false, 0, 0);
	
		updateLightPos();
		gl.uniform3fv(this.lightPosLoc, normalize([lightX, lightY, 5])); // Adjust Z for single highlight		
	
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}
	
	

	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture(img) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// You can set the texture image data using the following command.
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGB,
			gl.RGB,
			gl.UNSIGNED_BYTE,
			img);

		// Set texture parameters 
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			//handling non-power-of-two (NPOT) textures
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		}
		

		gl.useProgram(this.prog);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		const sampler = gl.getUniformLocation(this.prog, 'tex');
		gl.uniform1i(sampler, 0);
	}

	showTexture(show) {
		gl.useProgram(this.prog);
		gl.uniform1i(this.showTexLoc, show);
	}

	enableLighting(show) {
		gl.useProgram(this.prog); 
		gl.uniform1i(gl.getUniformLocation(this.prog, 'enableLighting'), show ? 1 : 0); 
		console.log("Lighting Enabled:", show); //debug
	}
	
	
	
	setAmbientLight(ambient) {
		console.log("Ambient Light Value:", ambient); //debug
		gl.useProgram(this.prog); 
		gl.uniform1f(this.ambientLoc, ambient);
	}

	setSecondTexture(img) {
		//create and bind a new texture for the second texture
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
	
		//upload the image data to the new texture
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
	
		//configure texture settings for non-power-of-two textures
		if (isPowerOf2(img.width) && isPowerOf2(img.height)) {
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}
	
		gl.useProgram(this.prog); 
	
		//bind the texture to texture unit 1
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, texture);
	
		//update the uniform for the second texture
		const tex2Loc = gl.getUniformLocation(this.prog, 'tex2');
		if (tex2Loc) {
			gl.uniform1i(tex2Loc, 1); 
			console.log("Second texture successfully bound to unit 1.");
		} else {
			console.error("Uniform 'tex2' not found or optimized out.");
		}

		DrawScene();
	}
	
	

	setBlendFactor(factor) {
		gl.useProgram(this.prog); 
		const normalizedFactor = factor / 100; 
		gl.uniform1f(this.blendFactorLoc, normalizedFactor); 
		console.log("Blend Factor Updated:", normalizedFactor); //debug
	}
	

	setSpecularLight(intensity) {
		const normalizedIntensity = intensity / 100; //normalize to [0, 1]
		gl.useProgram(this.prog);
		gl.uniform1f(this.specularIntensityLoc, normalizedIntensity); //specular intensity
		gl.uniform1f(this.shininessLoc, normalizedIntensity * 128);    //shininess factor 
		console.log("Specular Light Intensity Updated:", normalizedIntensity);
	}
	
}

function isPowerOf2(value) {
	return (value & (value - 1)) == 0;
}

function normalize(v, dst) {
	dst = dst || new Float32Array(3);
	var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	// make sure we don't divide by 0.
	if (length > 0.00001) {
		dst[0] = v[0] / length;
		dst[1] = v[1] / length;
		dst[2] = v[2] / length;
	}
	return dst;
}

// Vertex shader source code
const meshVS = `
			attribute vec3 pos; 
			attribute vec2 texCoord; 
			attribute vec3 normal;

			uniform mat4 mvp; 

			varying vec2 v_texCoord; 
			varying vec3 v_normal; 

			void main()
			{
				v_texCoord = texCoord;
				v_normal = normal;

				gl_Position = mvp * vec4(pos,1);
			}`;

// Fragment shader source code
/**
 * @Task2 : You should update the fragment shader to handle the lighting
 */
const meshFS = `
precision mediump float;

//uniforms
uniform bool showTex;               
uniform bool enableLighting;       
uniform sampler2D tex;             
uniform sampler2D tex2;             
uniform vec3 lightPos;             
uniform float ambient;              
uniform float specularIntensity;    
uniform float shininess;            
uniform float blendFactor;          

//varyings
varying vec2 v_texCoord;            
varying vec3 v_normal;              

void main() {
    vec3 baseColor = vec3(1.0);     //base color

    if (showTex) {
        vec4 texColor1 = texture2D(tex, v_texCoord);   
        vec4 texColor2 = texture2D(tex2, v_texCoord); 
        vec4 blendedTexColor = mix(texColor1, texColor2, blendFactor); //blend textures
        baseColor = blendedTexColor.rgb;          
	
		}

    vec3 lighting = baseColor;      //initialize lighting with the base color

    if (enableLighting) {
        vec3 normal = normalize(v_normal);             
        vec3 lightDir = normalize(lightPos);          
        vec3 viewDir = vec3(0.0, 0.0, 1.0);           
        vec3 reflectDir = reflect(-lightDir, normal); 

        //ambient lighting
        vec3 ambientLight = ambient * baseColor;

        //diffuse lighting 
        float diffuse = max(dot(normal, lightDir), 0.0);
        vec3 diffuseLight = diffuse * baseColor;

        //specular lighting 
        float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess); // Shininess controls the sharpness
        vec3 specularLight = specularIntensity * spec * vec3(1.0);       // Specular highlights are white

        //combine all
        lighting = ambientLight + diffuseLight + specularLight;
    }

    //final color
    gl_FragColor = vec4(lighting, 1.0); // Apply calculated lighting
}
	
`;



// Light direction parameters for Task 2
var lightX = 1;
var lightY = 1;

const keys = {};
function updateLightPos() {
	const translationSpeed = 1;
	if (keys['ArrowUp']) lightY -= translationSpeed;
	if (keys['ArrowDown']) lightY += translationSpeed;
	if (keys['ArrowRight']) lightX -= translationSpeed;
	if (keys['ArrowLeft']) lightX += translationSpeed;
}
///////////////////////////////////////////////////////////////////////////////////