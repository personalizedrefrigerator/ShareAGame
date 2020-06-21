// Include Vector.js
// Include Matrix.js
// Include Objects.js

// Vector.js, Matrix.js, and Objects.js
// are all created for share-dgame.firebaseapp.com.

var mainRoomVertexShaderSource = 
`
    attribute vec4 a_position;
    attribute vec4 a_color;
    attribute vec3 a_normal;
    attribute vec2 a_texCoord;
    attribute float a_textureMultiplier;
    
    uniform mat4 u_world;
    uniform mat4 u_camera;
    uniform mat4 u_view;
    
    uniform vec3 u_lightPosition;
    uniform vec3 u_cameraPosition;
    
    varying vec4 v_color;
    varying vec3 v_normal;
    varying vec3 v_toLight;
    varying vec3 v_toCamera;
    varying vec2 v_texCoord;
    varying float v_textureMultiplier;
    
    void main()
    {
        vec4 worldPosition = a_position * u_world;
        gl_Position = worldPosition * u_camera * u_view;
        
        //gl_Position.x *= -1.0;
        //gl_Position.z *= -1.0;
        
        v_color = a_color;
        v_normal = a_normal * mat3(u_world);
        
        v_toLight = u_lightPosition - worldPosition.xyz;
        v_toCamera = u_cameraPosition - worldPosition.xyz;
        
        v_texCoord = a_texCoord;
        
        v_textureMultiplier = a_textureMultiplier;
    }
`;

var mainRoomFragmentShaderSource = 
`
    precision mediump float;
    
    varying vec4 v_color;
    varying vec3 v_normal;
    varying vec3 v_toLight;
    varying vec3 v_toCamera;
    varying vec2 v_texCoord;
    varying float v_textureMultiplier;
    
    uniform float u_shininess;
    uniform sampler2D u_image;
    
    uniform float u_shapeIndex;
    uniform int u_mouseDetect;
    uniform vec2 u_mousePosition;
    
    uniform vec2 u_screenSize;
    
    void main()
    {
        gl_FragColor = v_color * (1.0 - v_textureMultiplier) + texture2D(u_image, v_texCoord) * v_textureMultiplier;
        gl_FragColor.a = 1.0;
        
        vec3 normal = normalize(v_normal);
        vec3 toLight = normalize(v_toLight);
        vec3 toCamera = normalize(v_toCamera);
        
        vec3 halfVector = normalize(toCamera + toLight);
        
        // The cosine of the angle between the normal and the vector, toLight.
        float lightValue = dot(normal, toLight);
        
        // Compute how well the vector between the light and camera
        //matches the normal, this is the shininess to be added.
        float specular = dot(halfVector, normal);
        
        if(specular > 0.0)
        {
            specular = pow(specular, u_shininess);
        }
        else
        {
            specular = 0.0;
        }
        
        gl_FragColor.rgb *= lightValue;
        gl_FragColor.rgb += specular;
        
        if(u_mouseDetect != 2)
        {
            vec2 screenPosition = gl_FragCoord.xy;
            screenPosition.y = u_screenSize.y - screenPosition.y;
            
            float distance = 3.0;
            
            if(screenPosition.x + distance > u_mousePosition.x && screenPosition.x - distance < u_mousePosition.x && screenPosition.y - distance < u_mousePosition.y && screenPosition.y + distance > u_mousePosition.y)
            {
                gl_FragColor.a = 0.4;
            }
            else
            {
                distance *= 2.0;
                
                if(screenPosition.x + distance > u_mousePosition.x && screenPosition.x - distance <= u_mousePosition.x && screenPosition.y - distance < u_mousePosition.y && screenPosition.y + distance > u_mousePosition.y)
                {
                    gl_FragColor.r = 1.0 / (u_shapeIndex + 1.0) * 255.0;
                    gl_FragColor.g = v_texCoord.x * 255.0;
                    gl_FragColor.b = v_texCoord.y * 255.0;
                    
                    gl_FragColor /= 255.0;
                }
                
                gl_FragColor.a = 1.0;
            }
        }
    }
`;

function RoomSimulation(textureSource, resizeTextureSource, onTextureSourceEvent, backgroundColor, onCameraMove)
{
    this.isSafari = navigator.userAgent.indexOf("iPad") > -1;
    this.onCameraMove = function(cameraPosition){} || onCameraMove;

    this.backgroundColor = backgroundColor || {"r": 100, "g": 155, "b": 255};
    this.webGLCanvas = document.createElement("canvas");
    this.webGLCanvas.style.position = "absolute";
    this.webGLCanvas.style.width = "100vw";
    this.webGLCanvas.style.height = "100vh";
    this.webGLCanvas.style.zIndex = "2";
    this.webGLCanvas.style.left = 0;
    this.webGLCanvas.style.top = 0;
    this.webGLCanvas.setAttribute("tabindex", "1");
    
    this.gl = this.webGLCanvas.getContext("webgl") || this.webGLCanvas.getContext("experimental-webgl");
    
    this.hiddenCanvas = document.createElement("canvas");
    this.hiddenCtx = this.hiddenCanvas.getContext("2d");
    
    this.hiddenCanvas.style.display = "block";
    this.hiddenCanvas.style.position = "absolute";
    this.hiddenCanvas.style.transform = "scale(0.5)";
    this.hiddenCanvas.style.left = 0;
    this.hiddenCanvas.style.top = 0;
    this.hiddenCanvas.style.zIndex = 4;
    this.hiddenCanvas.style.border = "4px solid red";
    //document.body.appendChild(this.hiddenCanvas);
    
    this.uniformLocations = {};
    this.attributeLocations = {};
    this.stopRenderLoop = false;
    this.textureSource = textureSource;
    
    this.objects = [];
    this.pressedKeys = {};
    
    document.body.appendChild(this.webGLCanvas);
    
    var me = this,
        simulation = this;
    
    this.show = function()
    {
        me.webGLCanvas.style.display = "block";
        me.stopRenderLoop = false;
        
        me.resizeSourceIfNecessary();
        me.webGLCanvas.focus();
        
        me.renderLoop();
    };
    
    this.hide = function()
    {
        me.webGLCanvas.style.display = "none";
        
        me.stopRenderLoop = true;
        
        me.resizeSourceIfNecessary();
    };
    
    this.resizeSourceIfNecessary = function()
    {
        if(!me.stopRenderLoop)
        {
            resizeTextureSource(500, 500);
        }
        else
        {
            resizeTextureSource(undefined, undefined);
        }
    };
    
    var propertiesHash = { "cubeCount": 150 };
    
    this.getProperty = function(key)
    {
        return propertiesHash[key];
    };
    
    this.setProperty = function(key, value)
    {
        propertiesHash[key] = value;
    };
    
    this.WorldObject = function(parent, worldMatrix, updateWorldMatrix, renderShape, saveWorldMatrix, restoreWorldMatrix)
    {
        var me = this;
        
        this.worldMatrix = worldMatrix;
        this.localMatrix = new Matrix(4, 4);
        this.updateWorldMatrix = updateWorldMatrix;
        this.renderShape = renderShape;
        
        simulation.objects.push(me);
        me.id = simulation.objects.length - 1;
        
        this.updateWorldMatrixAndRender = function()
        {
            me.saveWorldMatrix();
            
            me.updateWorldMatrix();
            me.renderShape(me.id);
            
            me.restoreWorldMatrix();
        };
        
        this.saveWorldMatrix = saveWorldMatrix || function()
        {
            me.worldMatrix.save();
            me.localMatrix.save();
        };
        
        this.restoreWorldMatrix = restoreWorldMatrix || function()
        {
            me.worldMatrix.restore();
            me.localMatrix.restore();
        };
        
        this.nodes = [];
        
        this.localMatrix.toIdentityMatrix();
        
        this.textureCanvas = document.createElement("canvas");
        this.textureCanvas.width = 300;
        this.textureCanvas.height = 300;
        
        this.textureCtx = this.textureCanvas.getContext("2d");
        
        this.render = function(gl, time)
        {
            if(me.renderPart)
            {
                gl.texImage2D(gl.TEXTURE_2D, // Target
                    0, // Level
                    gl.RGBA, gl.RGBA, // Internal and external format
                    gl.UNSIGNED_BYTE,
                    me.textureCanvas);
                    
                me.renderPart(gl, time);
            }
            else
            {
                me.renderChildren(gl, time);
            }
        };
        
        this.renderChildren = function(gl, time)
        {
            for(var i = 0; i < me.nodes.length; i++)
            {
                var backupWorld, backupLocal;
                
                me.saveWorldMatrix();
                
                me.nodes[i].localMatrix.save();
                
                me.nodes[i].localMatrix.from1DArray(me.localMatrix.to1DArray());
                
                me.nodes[i].render(gl, time);
                
                me.nodes[i].localMatrix.restore();
                
                me.restoreWorldMatrix();
            }
        };
        
        this.addChildOfType = function(typeOfChild)
        {
            var child = {};
            
            typeOfChild.call(child, me, me.worldMatrix, function(useToUpdate)
            {
                var temp = useToUpdate || child.localMatrix.getCopy();
                
                //temp.reverseMultiplyAndSet(useToUpdate || child.localMatrix);
                
                me.updateWorldMatrix(temp);
            }, me.renderShape, function()
            {
                child.localMatrix.save();
                child.worldMatrix.save();
                //me.saveWorldMatrix();
            }, function()
            {
                child.localMatrix.restore();
                child.worldMatrix.restore();
                //me.restoreWorldMatrix();
            });
            
            me.nodes.push(child);
            
            return child;
        };
    };
    
    this.Room = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 70;
        this.depth = 70;
        this.height = 70;
        
        this.textureCanvas.width = 1024 / 2;
        this.textureCanvas.height = 1024 / 2;
        
        var me = this;
        
        this.renderToTexture = function()
        {
            me.textureCtx.fillStyle = "rgba(192, 142, 116)";
            me.textureCtx.fillRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            me.textureCtx.lineWidth = 1;
            
            for(var x = 0; x < me.textureCanvas.width; x += Math.abs(Math.sin(x) + 1.05) * 3)
            {
                me.textureCtx.beginPath();
                me.textureCtx.moveTo(x, 0);
                me.textureCtx.lineTo(x + Math.cos(x * x) * 12, me.textureCanvas.height);
                me.textureCtx.stroke();
            }
        };
        
        requestAnimationFrame(me.renderToTexture);
        
        var counter = 0;
        
        this.renderPart = function(gl, time)
        {
            if(!me.isSafari)
            {
                simulation.faceTextureMultipliers = 
                [
                    1, 1, 1, 1, 1, 1
                ];
            }
            else
            {
                simulation.faceTextureMultipliers = 
                [
                    0.1, 0.1, 0.1, 0.1, 0.1, 0.1
                ];
            }
            
            simulation.updateVertexTextureMultipliers();
            
            me.saveWorldMatrix();
        
            me.saveWorldMatrix();
                me.localMatrix.translate(0, 6, 3, true);
                
                me.localMatrix.rotateX(Math.PI, true);
                
                me.localMatrix.scale(me.width, 1, me.depth, true);
                
                //me.localMatrix.rotateY(((time / 1000 / 6.28 * 100) % 100) * 6.28 / 100);
                //((time / 1000 / 6.28 * 100) % 100) * 6.28 / 100);
                
                me.localMatrix.translate(-0.5, -0.5, -0.5, true);
                
                me.updateWorldMatrix();
                
                me.renderShape(me.id);      
                
            me.restoreWorldMatrix();
            
            me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            simulation.resetFaceColorsAndTextureMultipliers();
            
            counter++;
            
            if(counter % 200 === 0 || me.isSafari)
            {
                me.renderToTexture();
                
                counter = 0;
            }
        };
        
        this.table1 = this.addChildOfType(simulation.Table);
        this.addChildOfType(simulation.Background);
        this.addChildOfType(simulation.DrawableCube);
        this.addChildOfType(simulation.PlayerZone);
    };
    
    this.HelpCube = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        var me = this;
        
        this.width = 20;
        this.height = 20;
        this.depth = 20;
        
        this.position = new Vector3(0, -15, 25);
        this.hidden = false;
        
        me.textureCanvas.width = 500;
        me.textureCanvas.height = 500;
        
        me.textureCtx.fillStyle = "white";
        me.textureCtx.fillRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
        me.textureCtx.fillStyle = "green";
        me.textureCtx.font = "12pt Serif";
        
        me.textureCtx.shadowColor = "rgba(100, 100, 0, 0.6)";
        me.textureCtx.shadowOffsetX = 1;
        me.textureCtx.shadowOffsetY = 2;
        me.textureCtx.shadowBlur = 2;
        
        me.textureCtx.lineWidth = 4;
        me.textureCtx.strokeStyle = "orange";
        
        for(var x = 0; x < me.textureCtx.canvas.width; x += me.textureCtx.canvas.width / 10)
        {
            me.textureCtx.beginPath();
            me.textureCtx.moveTo(me.textureCtx.canvas.width - x, me.textureCtx.canvas.height);
            me.textureCtx.lineTo(me.textureCtx.canvas.width, x);
            me.textureCtx.stroke();
        }
        
        me.textureCtx.textAlign = "left";
        me.textureCtx.textBaseline = "top";
        
        console.log("Added help cube.");
        
        var lines = 
        [
            "Help Cube",
            "Keyboard Commands:",
            "w  Forward.",
            "s  Backward.",
            "a  Look left.",
            "d  Look right.",
            "r  Move up.",
            "f  Move down.",
            "h  Access help cube.",
            "c  Toggle cull face.",
            "",
            "Touch commands:",
            "1 finger: look/interact",
            "2 fingers: move",
            "3 fingers: look",
            "4 fingers: move up or down"
        ];
        var y = 0;
        
        for(var i = 0; i < lines.length; i++)
        {
            me.textureCtx.fillText(lines[i], 0, y);
            y += me.textureCtx.measureText("W|").width;
        }
        
        this.renderPart = function(gl, time)
        {
            if(me.hidden)
            {
                return;
            }
            
            simulation.faceTextureMultipliers = 
            [
                0.8,
                0.7,
                0.6,
                0.5,
                0.4,
                0.3
            ];
            
            simulation.updateVertexTextureMultipliers();
            simulation.useDefaultTexCoords();
            
            me.saveWorldMatrix();
            
                me.localMatrix.translateByVector(me.position, true);
                        
                me.localMatrix.rotateY(Math.sin(time / 4000) / 15, true);
                
                me.localMatrix.scale(me.width, me.height, me.depth, true);
                
                me.localMatrix.translate(-0.5, 0, -0.5, true);
                
                me.updateWorldMatrixAndRender();
            
            me.restoreWorldMatrix();
            
            simulation.resetFaceColorsAndTextureMultipliers();
        };
        
        this.handleMouseDown = function()
        {
            me.hidden = true;
        };
    };
    
    this.BackgroundGraph = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 100;
        this.depth = 100;
        
        this.shapeWidth = 5;
        this.shapeHeight = 20;
        this.shapeDepth = 5;
        
        this.clearingWidth = 70;
        this.clearingDepth = 70;
        
        var me = this;
        this.renderPart = function(gl, time)
        {
            
        };
    };
    
    this.Background = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 100;
        this.height = 100;
        this.depth = 100;
        this.minDist = 10;
        
        this.textureCanvas.width = 150;
        this.textureCanvas.height = 150;
        
        this.cubeSize = 5;
        
        this.position = new Vector3(0, 0, 0);
        
        
        var me = this;
        this.renderPart = function(gl, time)
        {
            simulation.faceColors = 
            [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
                [1, 1, 0],
                [0, 1, 1],
                [1, 1, 1],
            ];
            
            simulation.faceTextureMultipliers = 
            [
                0.8,
                0.7,
                0.6,
                0.5,
                0.4,
                0.3
            ];
            
            simulation.updateVertexColors();
            simulation.updateVertexTextureMultipliers();
            
            var timeDivider = (simulation.getProperty("timeDivider") || 1);
            
            me.saveWorldMatrix();
            
                me.localMatrix.translateByVector(me.position, true);
            
                time /= timeDivider;
                
                var maximumCubes = simulation.getProperty("cubeCount");
                var increment = 1.1 * 1.1;
                
                //me.localMatrix.scale(me.width, me.height, me.depth, true);
                for(var i = 0; i <= maximumCubes; i += increment)
                {
                    me.saveWorldMatrix();
                    
                    me.localMatrix.rotateY(i / 3, true);
                    
                    me.localMatrix.translate(Math.tan(i / 10 + time / 10000), -Math.abs(Math.sin(i / 5) * me.height), Math.max(Math.abs(Math.cos(i / 12 * 6.28 - time / 11000)) * me.depth, me.minDist), true);
                    
                    me.localMatrix.scale(me.cubeSize, me.cubeSize - Math.abs(Math.sin(i / 4 - time / 2000)) * 2, me.cubeSize, true);
                    
                    me.localMatrix.rotateZ(Math.sin(time / 4000 + i / 12) * 1.4, true);
                    
                    me.updateWorldMatrixAndRender();
                    me.restoreWorldMatrix();
                }
            
            me.restoreWorldMatrix();
            
            me.saveWorldMatrix();
                me.localMatrix.toIdentityMatrix();
                me.localMatrix.translateByVector(me.position, true);
                
                me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            me.textureCtx.clearRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            
            me.textureCtx.fillStyle = "#00ff00";
            me.textureCtx.fillRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            
            me.textureCtx.beginPath();
            me.textureCtx.save();
            me.textureCtx.drawImage(simulation.gl.canvas, 0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            
            me.textureCtx.translate(me.textureCtx.canvas.width / 2, me.textureCtx.canvas.height / 2);
            
            me.textureCtx.rotate(Math.sin(time / 16000 * timeDivider) * 6.28);
            
            me.textureCtx.beginPath();
            
            me.textureCtx.moveTo(0, 0);
            me.textureCtx.arc(0, 0, me.textureCtx.canvas.height / 2, 0, Math.PI * 1 / 4, false);
            me.textureCtx.lineTo(0, 0);
            
            me.textureCtx.fillStyle = "rgba(255, 0, 0, 0.4)";
            me.textureCtx.strokeStyle = "rgba(200, 200, 0, 0.75)";
            me.textureCtx.lineWidth = 3;
            me.textureCtx.lineJoin = "round";
            me.textureCtx.lineCap = "round";
            
            me.textureCtx.fill();
            me.textureCtx.stroke();
            
            me.textureCtx.restore();
            
            simulation.resetFaceColorsAndTextureMultipliers();
        };
    };
    
    this.Table = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 12;
        this.height = 0.5;
        this.depth = 12;
        
        this.zRotation = Math.PI / 4;
        
        this.textureCanvas.width = 500;
        this.textureCanvas.height = 500;
        
        this.position = new Vector3(0, -1, 8);
        
        var me = this;
        this.handleMouseEvent = function(collision, type)
        {
            var mouseEvent = 
            {
                clientX: collision.texCoordX * simulation.textureSource.width,
                clientY: collision.texCoordY * simulation.textureSource.height,
                preventDefault: function(){},
                view: window,
                button: 1
            };
            
            me.lastMouseX = mouseEvent.clientX;
            me.lastMouseY = mouseEvent.clientY;
            
            onTextureSourceEvent("on" + type, mouseEvent);
            
            return true;
        };
        
        this.handleMouseDown = function(event)
        {
            return me.handleMouseEvent(event, "mousedown");
        };
        
        this.handleMouseMove = function(event)
        {
            return me.handleMouseEvent(event, "mousemove");
        };
        
        this.handleMouseUp = function(event)
        {
            return me.handleMouseEvent(event, "mouseup");
        };
        
        this.renderPart = function(gl, time)
        {
            simulation.faceColors = 
            [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
                [1, 1, 0],
                [0, 1, 1],
                [1, 1, 1],
            ];
            
            simulation.faceTextureMultipliers = 
            [
                0,
                0,
                0,
                0,
                0,
                1
            ];
            
            simulation.updateVertexColors();
            simulation.updateVertexTextureMultipliers();
            
            me.saveWorldMatrix();
            
                me.localMatrix.translateByVector(me.position, true);
            
                me.saveWorldMatrix();
                        
                    me.localMatrix.rotateY(Math.PI * 5 / 2, true);
                    me.localMatrix.rotateZ(Math.sin(time / 4000) * 0.01 + me.zRotation, true);
                    
                    me.localMatrix.scale(me.width, me.height, me.depth, true);
                    
                    
                    me.localMatrix.translate(-0.5, -0.5, -0.5, true);
                    
                    me.updateWorldMatrixAndRender();
                
                me.restoreWorldMatrix();
            
            me.restoreWorldMatrix();
            
            me.saveWorldMatrix();
                me.localMatrix.toIdentityMatrix();
                me.localMatrix.translateByVector(me.position, true);
                me.localMatrix.rotateY(Math.PI * 5 / 2, true);
                me.localMatrix.rotateZ(Math.sin(time / 4000) * 0.01 + me.zRotation, true);
                //me.localMatrix.rotateY(time / 1000, true);
                        
                //me.localMatrix.rotateY(Math.PI * 5 / 2, true);
                //me.localMatrix.rotateZ(Math.sin(time / 4000) * 0.01, true);
                
                me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            me.textureCtx.clearRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            
            var width, height;
            
            if(simulation.textureSource.width > simulation.textureSource.height)
            {
                width = 500;
                height = simulation.textureSource.height * me.textureCanvas.width / simulation.textureSource.width;
            }
            else
            {
                height = 500;
                width = simulation.textureSource.width * me.textureCanvas.height / simulation.textureSource.height;
            }
            
            me.textureCtx.fillStyle = "#aabbdd";
            me.textureCtx.fillRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            me.textureCtx.drawImage(simulation.textureSource, 0, 0, width, height); 
            
            if(me.lastMouseX && me.lastMouseY)
            {
                me.textureCtx.fillStyle = "rgba(255, 0, 0, 0.7)";
                me.textureCtx.fillRect(me.lastMouseX, me.lastMouseY, 10, 10);
            }
            
            simulation.resetFaceColorsAndTextureMultipliers();
        };
        
        var leg1 = this.addChildOfType(simulation.TableLeg);
        leg1.position.x = -me.width / 2;
        leg1.position.z = -me.depth / 2;
        
        var leg2 = this.addChildOfType(simulation.TableLeg);
        leg2.position.x = me.width / 2;
        leg2.position.z = me.depth / 2;
        
        var leg3 = this.addChildOfType(simulation.TableLeg);
        leg3.position.x = me.width / 2;
        leg3.position.z = -me.depth / 2;
        
        var leg4 = this.addChildOfType(simulation.TableLeg);
        leg4.position.x = -me.width / 2;
        leg4.position.z = me.depth / 2;
    };
    
    this.TableLeg = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 1;
        this.height = 8;
        this.depth = 1;
        
        this.textureCanvas.width = 500;
        this.textureCanvas.height = 500;
        
        this.position = new Vector3(0, 0, 0);
        
        this.rotationX = 0;
        this.rotationY = 0;
        
        var me = this;
        this.renderPart = function(gl, time)
        {
            simulation.faceColors = 
            [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1],
                [1, 1, 0],
                [0, 1, 1],
                [0.5, 0.5, 0],
            ];
            
            simulation.faceTextureMultipliers = 
            [
                0.4,
                0.4,
                0.4,
                0.4,
                0.4,
                0.4
            ];
            
            simulation.updateVertexColors();
            simulation.updateVertexTextureMultipliers();
            simulation.useAlternateTexCoords();
            
            //console.log("ME: " + me.localMatrix);
            //console.log("PARENT: " + parent.localMatrix);
            //me.localMatrix.transpose();
        
            me.saveWorldMatrix();
                me.localMatrix.translate(-0.5, 0, -0.5, true);
            
                me.localMatrix.translateByVector(me.position, true);
                
                me.localMatrix.scale(me.width, me.height, me.depth, true);
                
                me.updateWorldMatrixAndRender();
            
                //me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            simulation.resetFaceColorsAndTextureMultipliers();
            simulation.useDefaultTexCoords();
        };
        
        var lastX, lastY;
        this.handleMouseDown = function(event)
        {
            lastX = event.texCoordX;
            lastY = event.texCoordY;
            
            return true;
        };
        
        this.handleMouseMove = function(event)
        {
            if(event.mouseDown)
            {
                me.textureCtx.save();
                me.textureCtx.strokeStyle = "white";
                
                me.textureCtx.lineCap = "round";
                me.textureCtx.lineWidth = 0.01;
                
                me.textureCtx.scale(me.textureCtx.canvas.width, me.textureCtx.canvas.height);
                
                me.textureCtx.beginPath();
                me.textureCtx.moveTo(event.texCoordX, event.texCoordY);
                me.textureCtx.lineTo(lastX, lastY);
                me.textureCtx.stroke();
                me.textureCtx.restore();
                
                lastX = event.texCoordX;
                lastY = event.texCoordY;
            }
            
            return true;
        };
        
        this.handleMouseUp = function(event)
        {
            return true;
        };
    };
    
    this.PlayerZone = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 2;
        this.height = 3;
        this.depth = 2;
        
        var playerData = {};
        
        var me = this;
        me.playerUid = "";
        
        me.textureCtx.textAlign = "left";
        me.textureCtx.textBaseline = "top";
        me.textureCtx.fillStyle = "white";
        me.textureCtx.font = "50pt Chiller, Cursive";
        
        me.textureCtx.fillText("Player", 0, 0);
        
        simulation.setPlayerUid = function(uid)
        {
            me.playerUid = uid;
        };
        
        simulation.updatePlayer = function(uid, position, yRotation, timeStamp)
        {
            playerData[uid] = 
            {
                position: position,
                timeStamp: timeStamp,
                yRotation: yRotation
            };
        };
        
        this.renderPart = function(gl, time)
        {
            simulation.faceColors = 
            [
                [1, 0, 0],
                [0, 0, 1],
                [1, 0, 1],
                [0, 1, 1],
                [1, 1, 0],
                [1, 1, 1],
            ];
            
            simulation.updateVertexColors();
        
            me.saveWorldMatrix();
            
                for(var uid in playerData)
                {
                    if(playerData[uid] && uid !== me.playerUid)// && simulation.cameraPosition.subtract(playerData[uid].position).getMagnitude() > 1)
                    {
                        if(time - playerData[uid].timeStamp > 30000)
                        {
                            delete playerData[uid];
                            continue;
                        }
                        
                        me.saveWorldMatrix();
                        
                        me.localMatrix.translateByVector(playerData[uid].position, true);
                        
                        me.localMatrix.rotateY(playerData[uid].yRotation || 0, true);
                        
                        me.localMatrix.scale(me.width, me.height, me.depth, true);
                        
                        me.localMatrix.translate(-0.5, -0.5, -0.5, true);
                        
                        me.updateWorldMatrix();
                        me.renderShape(me.id);
                        
                        me.restoreWorldMatrix();
                    }
                }
                
                me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            simulation.resetFaceColorsAndTextureMultipliers();
        };
    };
    
    this.DrawableCube = function(parent)
    {
        simulation.WorldObject.apply(this, arguments);
        
        this.width = 20;
        this.height = 20;
        this.depth = 20;
        
        this.textureCanvas.width = 2048;
        this.textureCanvas.height = 2048;
        
        this.position = new Vector3(0, -15, -22);
        
        this.rotationX = 0;
        this.rotationY = 0;
        
        this.drawingDisplay = new DrawingDisplay("dw-S255,0,255,1bm");
        simulation.setProperty("sharedCubeSrc", this.drawingDisplay.src);
        
        this.onSrcChange = function() {};
        
        var me = this;
        simulation.setSharedImageCubeImage = function(imageSrc)
        {
            me.drawingDisplay.setSrc(imageSrc);
            
            me.textureCtx.clearRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            me.renderCtxBackground(me.textureCtx);
            me.drawingDisplay.render(me.textureCtx);
            
            
            simulation.setProperty("sharedCubeSrc", me.drawingDisplay.src);
        };
        
        simulation.appendToSharedImageCubeImage = function(addToEnd)
        {
            me.drawingDisplay.setSrc(me.drawingDisplay.src + addToEnd);
            
            me.textureCtx.clearRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
            me.renderCtxBackground(me.textureCtx);
            
            me.drawingDisplay.render(me.textureCtx);
            
            
            simulation.setProperty("sharedCubeSrc", me.drawingDisplay.src);
        };
        
        simulation.setOnSharedImageCubeSrcChange = function(onChange)
        {
            me.onSrcChange = onChange || function() {};
        };
        
        this.renderCtxBackground = function(ctx)
        {
            ctx = ctx || me.textureCtx;
            
            ctx.save();
            
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.shadowBlur = 1.0;
            ctx.shadowColor = "rgba(255, 0, 0, 0.5)";
            
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.font = "italic 10pt Serif";
            
            ctx.fillStyle = "white";
            
            ctx.fillText("Draw Here", 0, ctx.canvas.height / 4);
            
            ctx.restore();
        };
        
        this.renderPart = function(gl, time)
        {
            simulation.faceColors = 
            [
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1],
                [1, 1, 1],
            ];
            
            simulation.faceTextureMultipliers = 
            [
                0.8,
                0.8,
                0.8,
                0.8,
                0.8,
                0.8
            ];
            
            simulation.updateVertexColors();
            simulation.updateVertexTextureMultipliers();
            simulation.useAlternateTexCoords();
            
            //console.log("ME: " + me.localMatrix);
            //console.log("PARENT: " + parent.localMatrix);
            //me.localMatrix.transpose();
        
            me.saveWorldMatrix();
                me.localMatrix.translateByVector(me.position, true);
                
                me.localMatrix.scale(me.width, me.height, me.depth, true);
                
                me.localMatrix.rotateY(Math.PI, true);
                
                me.localMatrix.translate(-0.5, 0, -0.5, true);
                
                me.updateWorldMatrixAndRender();
            
                //me.renderChildren(gl, time);
            
            me.restoreWorldMatrix();
            
            simulation.resetFaceColorsAndTextureMultipliers();
            simulation.useDefaultTexCoords();
        };
        
        var lastX, lastY, startX, startY;
        var mouseWasDown = false;
        var angleSum = 0, angleCount = 0;
        var lastAngleToStart = 0;
        this.handleMouseDown = function(event)
        {
            lastX = event.texCoordX;
            lastY = event.texCoordY;
            startX = event.texCoordX;
            startY = event.texCoordY;
            angleSum = 0;
            angleCount = 0;
            mouseWasDown = true;
            
            return true;
        };
        
        this.handleMouseMove = function(event)
        {
            if(event.mouseDown)
            {
                var currentX, currentY;
                
                currentX = event.texCoordX;//Math.floor(event.texCoordX * 2000) / 2000;
                currentY = event.texCoordY;//Math.floor(event.texCoordY * 2000) / 2000;
            
                me.textureCtx.save();
                me.textureCtx.strokeStyle = "white";
                
                me.textureCtx.lineCap = "round";
                me.textureCtx.lineWidth = 0.002;
                
                me.textureCtx.scale(me.textureCtx.canvas.width, me.textureCtx.canvas.height);
                
                me.textureCtx.beginPath();
                me.textureCtx.moveTo(currentX, currentY);
                me.textureCtx.lineTo(startX, startY);
                me.textureCtx.stroke();
                me.textureCtx.restore();
                
                //var toCurrent = new Vector3(currentX - lastX, currentY - lastY, 0);
                //var toStart = new Vector3(lastX - startX, lastY - startY, 0);
                var toStartFromCurrent = new Vector3(currentX - startX, currentY - startY, 0);
                
                //var angleBetween = Math.acos(toCurrent.dotAsFloat(toStart));
                var distanceFromStart = toStartFromCurrent.getMagnitude();
                
                /*angleBetween *= 180 / Math.PI;
                
                angleBetween = Math.abs(angleBetween);
                
                angleBetween %= 90;*/
                
                var angleToStart = toStartFromCurrent.zAngle();
                
                angleSum += angleToStart;
                angleCount++;
                
                if(distanceFromStart > 0.25 / 64 && Math.abs(lastAngleToStart - angleToStart) > Math.PI / 15 * 2 * 1.5)
                {
                    me.endLine(lastX, lastY);
                }
                
                if(Math.abs(lastAngleToStart - angleToStart) < Math.PI / 17 * 2)
                {
                    lastAngleToStart = angleToStart;
                }
                
                lastX = currentX;
                lastY = currentY;
            }
            
            return true;
        };
        
        this.endLine = function(currentX, currentY)
        {
            if((startX !== currentX || startY !== currentY))
            {
                me.textureCtx.clearRect(0, 0, me.textureCtx.canvas.width, me.textureCtx.canvas.height);
                
                me.renderCtxBackground(me.textureCtx);
                
                var justAdded = "";
                
                justAdded += "" + Math.floor(startX * me.textureCtx.canvas.width) + "," + Math.floor(startY * me.textureCtx.canvas.height);
                justAdded += "m" + Math.floor(currentX * me.textureCtx.canvas.width) + "," + Math.floor(currentY * me.textureCtx.canvas.height);
                justAdded += "z"; // Stroke and begin path.
                
                me.drawingDisplay.src += justAdded;
                
                me.drawingDisplay.render(me.textureCtx);
                
                me.onSrcChange(me.drawingDisplay.src, justAdded);
                simulation.setProperty("sharedCubeSrc", me.drawingDisplay.src);
                
                startX = currentX;
                startY = currentY;
                
                angleSum = 0;
                angleCount = 0;
            }
        };
        
        this.handleMouseUp = function(event)
        {
            if(mouseWasDown)
            {
                me.endLine(event.texCoordX, event.texCoordY);
            }
            
            mouseWasDown = false;
            
            return true;
        };
    };
    
    this.load = function()
    {
        var gl = me.gl;
        
        var compileShader = function(gl, type, source)
        {
            var shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            
            gl.compileShader(shader);
            
            if(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            {
                return shader;
            }
            else
            {
                console.error("Shader Compile Error: " + gl.getShaderInfoLog(shader));
                
                gl.deleteShader(shader);
            }
        };
        
        var linkProgram = function(gl, vertexShader, fragmentShader)
        {
            var program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            
            gl.linkProgram(program);
            
            if(gl.getProgramParameter(program, gl.LINK_STATUS))
            {
                return program;
            }
            else
            {
                console.error("Program Link Error: " + gl.getProgramInfoLog(program));
                gl.deleteProgram(program);
            }
        };
        
        var vertexShader = compileShader(gl, gl.VERTEX_SHADER, mainRoomVertexShaderSource);
        var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, mainRoomFragmentShaderSource);
        
        var program = linkProgram(gl, vertexShader, fragmentShader);
        gl.useProgram(program);
        
        // Get uniform locations.
        me.uniformLocations["u_world"] = gl.getUniformLocation(program, "u_world");
        me.uniformLocations["u_camera"] = gl.getUniformLocation(program, "u_camera");
        me.uniformLocations["u_view"] = gl.getUniformLocation(program, "u_view");
        
        me.uniformLocations["u_shininess"] = gl.getUniformLocation(program, "u_shininess");
        me.uniformLocations["u_lightPosition"] = gl.getUniformLocation(program, "u_lightPosition");
        me.uniformLocations["u_cameraPosition"] = gl.getUniformLocation(program, "u_cameraPosition");
        me.uniformLocations["u_shapeIndex"] = gl.getUniformLocation(program, "u_shapeIndex");
        me.uniformLocations["u_mouseDetect"] = gl.getUniformLocation(program, "u_mouseDetect");
        me.uniformLocations["u_screenSize"] = gl.getUniformLocation(program, "u_screenSize");
        me.uniformLocations["u_mousePosition"] = gl.getUniformLocation(program, "u_mousePosition");
        
        
        
        // Get attribute locations.
        me.attributeLocations["a_position"] = gl.getAttribLocation(program, "a_position");
        me.attributeLocations["a_color"] = gl.getAttribLocation(program, "a_color");
        me.attributeLocations["a_normal"] = gl.getAttribLocation(program, "a_normal");
        me.attributeLocations["a_texCoord"] = gl.getAttribLocation(program, "a_texCoord");
        me.attributeLocations["a_textureMultiplier"] = gl.getAttribLocation(program, "a_textureMultiplier");
        
        // Get buffers.
        me.positionBuffer = gl.createBuffer();
        me.colorBuffer = gl.createBuffer();
        
        // Set up and put data in the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, me.positionBuffer);
        
        gl.enableVertexAttribArray(me.attributeLocations.a_position);
        
        gl.vertexAttribPointer(me.attributeLocations.a_position, 3, // Components per calling of shader.
                gl.FLOAT, // Data type.
                false, // No normalization.
                0, 0); // Stride and offset.
                
        me.cubeVerticies = object3D.getScaledCubeVerticies(1 / 20);
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.cubeVerticies), gl.STATIC_DRAW);
        
        // Set up and put data in the color buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, me.colorBuffer);
        
        gl.enableVertexAttribArray(me.attributeLocations.a_color);
        
        gl.vertexAttribPointer(me.attributeLocations.a_color, 3, // Components per calling of shader.
                gl.FLOAT, // Data type.
                false, // No normalization
                0, 0); // Stride and offset.
                
        me.faceColors = 
        [
            [192 / 256, 142 / 256, 116 / 256],
            [170 / 256, 142 / 256, 125 / 256],
            [200 / 256, 142 / 256, 116 / 256],
            [170 / 256, 152 / 256, 125 / 256],
            [192 / 256, 162 / 256, 116 / 256],
            [170 / 256, 142 / 256, 135 / 256],
        ];
        
        me.updateVertexColors();
        
        // Set up and put data in the normals buffer.
        me.normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, me.normalsBuffer);
        
        gl.enableVertexAttribArray(me.attributeLocations.a_normal);
        
        gl.vertexAttribPointer(me.attributeLocations.a_normal, 3, // 3 values per calling of shader
                gl.FLOAT, // Type
                false, // No normalization
                0, 0); // Stride and offset.
        
        me.cubeNormals = object3D.getNormals(me.cubeVerticies);
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.cubeNormals), gl.STATIC_DRAW);
        
        // Set up and put data in the texture-coordinate buffer.
        me.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, me.texCoordBuffer);
        
        gl.enableVertexAttribArray(me.attributeLocations.a_texCoord);
        
        gl.vertexAttribPointer(me.attributeLocations.a_texCoord, 2, // 2 values per calling of shader
                gl.FLOAT, // Type
                false, // No normalization.
                0, 0); // Stride and offset.
                
        me.textureCoordinates = object3D.getTextureLocations(me.cubeVerticies.length / 3);
        me.alternateTextureCoordinates = object3D.getCubeTexCoords();
        
        me.usingAlternateTexCoords = false;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.textureCoordinates), gl.DYNAMIC_DRAW);
        
        // Handle the texture multipliers.
        me.textureMultiplierBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, me.textureMultiplierBuffer);
        
        gl.enableVertexAttribArray(me.attributeLocations.a_textureMultiplier);
        
        gl.vertexAttribPointer(me.attributeLocations.a_textureMultiplier, 1, // 1 value per calling
                gl.FLOAT, // Type
                false, // No normalization.
                0, 0); // Stride and offset.
                
        me.faceTextureMultipliers = 
        [
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
            0.5
        ];
        
        me.updateVertexTextureMultipliers();
        
        me.texture = me.createTexture();
        
        // Handle positions.
        me.lightPosition = new Vector3(0, -2, 1);
        me.cameraPosition = new Vector3(0, 0, 1);
        
        
        me.cameraRotation = new Vector3(0, 0, 0);
        
        // Handle view matricies.
        me.worldMatrix = new Matrix(4, 4);
        me.worldMatrix.toIdentityMatrix();
        
        me.upVector = new Vector3(0, -1, 0);
        
        me.cameraTranslateMatrix = new Matrix(4, 4);
        me.cameraTranslateMatrix.toIdentityMatrix();
        
        me.resetCameraMatrix();
        
        me.viewMatrix = new Matrix(4, 4);
        me.viewMatrix.toIdentityMatrix();
        
        // Store the matricies.
        me.updateMatricies();
        
        // Set other uniforms.
        gl.uniform1f(me.uniformLocations.u_shininess, 50.0);
        
        gl.uniform1f(me.uniformLocations.u_shapeIndex, 0.0);
        gl.uniform1i(me.uniformLocations.u_mouseDetect, 1);
        gl.uniform2fv(me.uniformLocations.u_screenSize, [gl.canvas.width, gl.canvas.height]);
        gl.uniform2fv(me.uniformLocations.u_mousePosition, [50, 50]);
        
        me.updateLightLocation();
        me.updateCameraLocation();
        
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        
        me.cullFace = true;
        
        gl.clearColor(0.2, 0.5, 0.6, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        me.storeObjectId = true;
        
        // Create objects.
        me.room = new me.Room(me, me.worldMatrix, function(multiplyBy)
        {
            me.worldMatrix.toIdentityMatrix();
        
            me.worldMatrix.multiplyAndSet(multiplyBy || me.room.localMatrix);
            
            me.worldMatrix.transpose();
            
            me.updateWorldMatrix();
        }, function(objectId, fillType, offset, count)
        {
            if (me.storeObjectId || true)
            {
                gl.uniform1f(me.uniformLocations.u_shapeIndex, objectId);
            }
            
            
            gl.drawArrays(fillType || gl.TRIANGLES, offset || 0, // Offset
                    count || (me.cubeVerticies.length / 3));
                
        });
        
        // Handle input.
        var lastX = 0;
        var lastY = 0;
        var mouseDown = false;
        
        var rotateCamera = function(x, y)
        {
            me.cameraRotation.y += x;
            me.cameraRotation.x += y;
            
            me.updateMatricies();
        };
        
        var pointerMove = function(clientX, clientY)
        {
            rotateCamera((clientX - lastX) / gl.canvas.width * 6.28 * 3, (clientY - lastY) / gl.canvas.height * 6.28 * 3);
            
            lastX = clientX;
            lastY = clientY;
        };
        
        var objectIdChangeHandled = true;
        
        var lastObjectId = -1;
        var handleObjectPointerAction = function(action, endAction, e)
        {
            gl.uniform2fv(me.uniformLocations.u_mousePosition, [e.clientX, e.clientY]);
            var position = me.determineMousePosition();
            
            var property = "handleClick";
            
            if(action === "mousemove")
            {
                property = "handleMouseMove";
            }
            else if(action === "mousedown")
            {
                property = "handleMouseDown";
            }
            else if(action === "mouseup")
            {
                property = "handleMouseUp";
            }
            
            position.mouseDown = mouseDown;
            
            if((position.objectId === -1 || !me.objects[position.objectId][property] || !me.objects[position.objectId][property](position)))
            {
                endAction(e.clientX, e.clientY);
            }
            
            if(position.objectId !== lastObjectId && mouseDown && action === "mousemove")
            {
                if(lastObjectId !== -1 && me.objects[lastObjectId].handleMouseUp)
                {
                    me.objects[lastObjectId].handleMouseUp(position);
                }
                
                if(position.objectId !== -1 && me.objects[position.objectId].handleMouseDown)
                {
                    me.objects[position.objectId].handleMouseDown(position);
                }
            }
            
            lastObjectId = position.objectId;
        };
        
        gl.canvas.onmousedown = function(e)
        {
            mouseDown = true;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            handleObjectPointerAction("mousedown", function()
            {
            
            }, e);
            
            objectIdChangeHandled = false;
        };
        
        gl.canvas.onmousemove = function(e)
        {
            handleObjectPointerAction("mousemove", function(x, y)
            {
                if(mouseDown)
                {
                    pointerMove(x, y);
                }
            }, e);
            
            lastX = e.clientX;
            lastY = e.clientY;
        };
        
        gl.canvas.onmouseup = function(e)
        {
            mouseDown = false;
            
            handleObjectPointerAction("mouseup", function(x, y)
            {
                
            }, e);
            
            objectIdChangeHandled = true;
            
            changeMovment();
        };
        
        gl.canvas.onmouseleave = function(e)
        {
            mouseDown = false;
            
            handleObjectPointerAction("mouseup", function(x, y)
            {
                
            }, e);
        };
        
        var moveForward = function(vectorDisplacement)
        {
            var positionChangeVector = vectorDisplacement || (new Vector3(0, 0, -1));
            
            var rotateMatrix = new Matrix(4, 4);
            rotateMatrix.toIdentityMatrix();
            
            rotateMatrix.rotateY(-me.cameraRotation.y);
            //rotateMatrix.rotateX(me.cameraRotation.x);
            //rotateMatrix.rotateZ(me.cameraRotation.z);
            
            rotateMatrix.transformVector(positionChangeVector);
            
            me.cameraPosition = me.cameraPosition.subtract(positionChangeVector);
            me.lightPosition = me.lightPosition.subtract(positionChangeVector);
            me.cameraTranslateMatrix.translateByVector(positionChangeVector);
            
            me.updateCameraLocation();
            me.updateLightLocation();
        };
        
        var changeMovment = function()
        {
            me.onCameraMove(me.cameraPosition, me.cameraRotation);
        };
        
        gl.canvas.addEventListener("keydown", function(e)
        {
            e.preventDefault();
            
            me.pressedKeys[e.key] = true;
        }, true);
        
        gl.canvas.addEventListener("keyup", function(e)
        {
            e.preventDefault();
            
            me.pressedKeys[e.key] = false;
            
            if(e.key === "c")
            {
                if(me.cullFace)
                {
                    gl.disable(gl.CULL_FACE);
                }
                else
                {
                    gl.enable(gl.CULL_FACE);
                }
                
                me.cullFace = !me.cullFace;
            }
            else if(e.key === "h")
            {
                me.room.addChildOfType(me.HelpCube);
            }
            
            changeMovment();
        }, true);
        
        var lastTime = (new Date()).getTime();
        var nowTime = 0, deltaT = 0;
        me.animateWithKey = function()
        {
            nowTime = (new Date()).getTime();
            
            deltaT = (nowTime - lastTime) / 30;
            
            if(me.pressedKeys["w"])
            {
                moveForward(new Vector3(0, 0, -0.5 * deltaT));
            }
            else if(me.pressedKeys["s"])
            {
                moveForward(new Vector3(0, 0, 0.5 * deltaT));
            }
            else if(me.pressedKeys["a"])
            {
                rotateCamera(-0.1 * deltaT, 0);
            }
            else if(me.pressedKeys["d"])
            {
                rotateCamera(0.1 * deltaT, 0);
            }
            else if(me.pressedKeys["f"])
            {
                moveForward(new Vector3(0, -0.5 * deltaT, 0));
            }
            else if(me.pressedKeys["r"])
            {
                moveForward(new Vector3(0, 0.5 * deltaT, 0));
            }
            
            lastTime = nowTime;
        };
        
        gl.canvas.style.touchAction = "none";
        
        var lastTouchCount = 0;
        
        try
        {
            gl.canvas.addEventListener("touchstart", function(e)
            {
                if(e.changedTouches.length > 0)
                {
                    e.preventDefault();
                    
                    if(e.changedTouches.length === 1)
                    {
                        handleObjectPointerAction("mousedown", function()
                        {
                        
                        }, e.changedTouches[0]);
                    }
                    
                    lastX = e.changedTouches[0].clientX;
                    lastY = e.changedTouches[0].clientY;
                    
                    mouseDown = true;
                    objectIdChangeHandled = false;
                }
                
                lastTouchCount = e.changedTouches.length;
                
                changeMovment();
            }, true);
            
            gl.canvas.addEventListener("touchmove", function(e)
            {
                if(e.changedTouches.length > 0 && e.changedTouches.length === lastTouchCount)
                {
                    e.preventDefault();
                    
                    if(e.changedTouches.length === 1)
                    {
                        handleObjectPointerAction("mousemove", function(x, y)
                        {
                            pointerMove(x, y);
                        }, e.changedTouches[0]);
                        
                        lastX = e.changedTouches[0].clientX;
                        lastY = e.changedTouches[0].clientY;
                    }
                    else if(e.changedTouches.length === 2)
                    {
                        var x = e.changedTouches[0].clientX;
                        var y = e.changedTouches[0].clientY;
                        
                        moveForward(new Vector3(0, 0, (y - lastY) / gl.canvas.height * 24));
                        
                        lastX = x;
                        lastY = y;
                    }
                    else if(e.changedTouches.length === 4)
                    {
                        var x = e.changedTouches[0].clientX;
                        var y = e.changedTouches[0].clientY;
                        
                        moveForward(new Vector3(0, (y - lastY) / gl.canvas.height * 24, 0));
                        
                        lastX = x;
                        lastY = y;
                    }
                    else
                    {
                        pointerMove(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }
                
                lastTouchCount = e.changedTouches.length;
            }, true);
            
            gl.canvas.addEventListener("touchend", function(e)
            {
                if(e.changedTouches.length > 0)
                {
                    e.preventDefault();
                    
                    if(e.changedTouches.length === 1)
                    {
                        handleObjectPointerAction("mouseup", function()
                        {
                        
                        }, e.changedTouches[0]);
                    }
                    
                    mouseDown = false;
                    objectIdChangeHandled = true;
                }
                
                changeMovment();
            }, true);
        }
        catch(e)
        {
            alert(e);
        }
        
        window.room = me;
    };
    
    this.updateLightLocation = function()
    {
        me.gl.uniform3fv(me.uniformLocations.u_lightPosition, me.lightPosition.toArray());
    };
    
    this.updateCameraLocation = function()
    {
        me.gl.uniform3fv(me.uniformLocations.u_cameraPosition, me.cameraPosition.toArray());
    };
    
    this.updateMatricies = function()
    {
        var gl = me.gl;
        
        gl.uniformMatrix4fv(me.uniformLocations.u_world, false, me.worldMatrix.to1DArray());
        gl.uniformMatrix4fv(me.uniformLocations.u_camera, false, me.cameraMatrix.to1DArray());
        gl.uniformMatrix4fv(me.uniformLocations.u_view, false, me.viewMatrix.to1DArray());
    };
    
    this.updateWorldMatrix = function()
    {
        var gl = me.gl;
        
        gl.uniformMatrix4fv(me.uniformLocations.u_world, false, me.worldMatrix.to1DArray());
    };
    
    this.updateCameraMatrix = function()
    {
        var gl = me.gl;
        
        gl.uniformMatrix4fv(me.uniformLocations.u_camera, false, me.cameraMatrix.to1DArray());
    };
    
    this.useAlternateTexCoords = function()
    {
        var gl = me.gl;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, me.texCoordBuffer);
        
        if(!me.usingAlternateTexCoords)
        {
            me.usingAlternateTexCoords = true;
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.alternateTextureCoordinates), gl.DYNAMIC_DRAW);
        }
    };
    
    this.useDefaultTexCoords = function()
    {
        var gl = me.gl;
        
        gl.bindBuffer(gl.ARRAY_BUFFER, me.texCoordBuffer);
        
        if(me.usingAlternateTexCoords)
        {
            me.usingAlternateTexCoords = false;
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.textureCoordinates), gl.DYNAMIC_DRAW);
        }
    };
    
    this.updateVertexColors = function()
    {
        var gl = me.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, me.colorBuffer);
        
        me.vertexColors = [];
        
        // Process faceColors.
        var vertexIndex;
        var colorComponentIndex;
        for(var faceIndex = 0; faceIndex < me.faceColors.length; faceIndex++)
        {
            // 6 verticies per face
            for(vertexIndex = 0; vertexIndex < 6; vertexIndex++)
            {
                for(colorComponentIndex = 0; colorComponentIndex < me.faceColors[faceIndex].length;
                        colorComponentIndex++)
                {
                    me.vertexColors.push(me.faceColors[faceIndex][colorComponentIndex]);
                }
            }
        }
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.vertexColors), gl.DYNAMIC_DRAW);
    };
    
    this.updateVertexTextureMultipliers = function()
    {
        var gl = me.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, me.textureMultiplierBuffer);
        
        me.vertexTextureMultipliers = [];
                
        for(var i = 0; i < me.faceTextureMultipliers.length; i++)
        {
            for(var j = 0; j < 6; j++)
            {
                me.vertexTextureMultipliers.push(me.faceTextureMultipliers[i]);
            }
        }
                
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(me.vertexTextureMultipliers), gl.DYNAMIC_DRAW);
    };
    
    this.checkResize = function()
    {
        if(me.webGLCanvas.width !== me.webGLCanvas.clientWidth
                || me.webGLCanvas.height !== me.webGLCanvas.clientHeight)
        {
            me.webGLCanvas.width = me.webGLCanvas.clientWidth;
            me.webGLCanvas.height = me.webGLCanvas.clientHeight;
            
            me.hiddenCanvas.width = me.webGLCanvas.width;
            me.hiddenCanvas.height = me.webGLCanvas.height;
            
            me.gl.viewport(0, 0, me.gl.drawingBufferWidth, me.gl.drawingBufferHeight);
            
            me.viewMatrix = Matrix44Helper.perspective(70 * Math.PI / 180, 1, 2000, me.gl.drawingBufferHeight / me.gl.drawingBufferWidth);
            
            
            me.gl.uniform2fv(me.uniformLocations.u_screenSize, [me.gl.canvas.width, me.gl.canvas.height]);
            
            me.viewMatrix.transpose();
            
            me.updateMatricies();
        }
    };
    
    this.createTexture = function()
    {
        var gl = me.gl;
        var texture = gl.createTexture();
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        
        return texture;
    };
    
    this.resetFaceColorsAndTextureMultipliers = function()
    {
        me.faceColors = 
        [
            [192 / 256, 142 / 256, 116 / 256],
            [170 / 256, 142 / 256, 125 / 256],
            [200 / 256, 142 / 256, 116 / 256],
            [170 / 256, 152 / 256, 125 / 256],
            [192 / 256, 162 / 256, 116 / 256],
            [170 / 256, 142 / 256, 135 / 256],
        ];
        
        me.updateVertexColors();
        
        me.faceTextureMultipliers = 
        [
            0.5,
            0.5,
            0.5,
            0.5,
            0.5,
            0.5
        ];
        
        me.updateVertexTextureMultipliers();
    };
    
    this.resetCameraMatrix = function()
    {
        me.cameraMatrix = Matrix44Helper.lookAt(new Vector3(0, 0, 1), me.upVector, new Vector3(0, 0, -10));
        
        me.cameraMatrix.multiplyAndSet(me.cameraTranslateMatrix);
        
        me.cameraMatrix.rotateY(me.cameraRotation.y);
        me.cameraMatrix.rotateX(me.cameraRotation.x);
        me.cameraMatrix.rotateZ(me.cameraRotation.z);
        
        me.cameraMatrix.transpose();
        
        me.updateCameraMatrix();
    };
    
    this.determineMousePosition = function()
    {
        var gl = me.gl;
        //gl.uniform1i(me.uniformLocations.u_mouseDetect, 1);
        me.storeObjectId = true;
        
        //gl.clearColor(0.0, 0.0, 0.0, 1.0);
        
        me.renderOnce();
        
        me.hiddenCtx.clearRect(0, 0, me.hiddenCtx.canvas.width, me.hiddenCtx.canvas.height);
        
        me.hiddenCtx.drawImage(gl.canvas, 0, 0, me.hiddenCtx.canvas.width, me.hiddenCtx.canvas.height);
        
        var imageData = me.hiddenCtx.getImageData(0, 0, me.hiddenCtx.canvas.width, me.hiddenCtx.canvas.height);
        var data = imageData.data;
        
        var mouseX = -1;
        var mouseY = -1;
        var objectId = -1;
        var texCoordX = -1;
        var texCoordY = -1;
        
        var useNext = false;
        for(var i = 0; i < data.length; i += 4)
        {
            if(data[i + 3] <= 220 && data[i + 3] >= 70)
            {
                useNext = true;
            }
            else if(useNext && data[i + 3] > 230)
            {
                mouseX = (i / 4) % imageData.width;
                mouseY = Math.floor(i / imageData.width / 4);
                
                //console.log("(" + mouseX + ", " + mouseY + ") -- " + data[i + 3]);
                
                var red = data[i];
                var green = data[i + 1];
                var blue = data[i + 2];
                var alpha = data[i + 3];
                
                //1.0 / (u_shapeIndex + 1.0) * 255.0
                objectId = Math.round(1.0 / (red / 255.0) - 1.0);
                texCoordX = green / 255.0;
                texCoordY = blue / 255.0;
                
                //console.warn(1.0 / (red / 255.0) - 1.0);
                
                //console.warn(objectId + ", r: " + red + " -- (" + [texCoordX, texCoordY].join(",") + ")");
                
                break;
            }
        }
        
        //gl.uniform1i(me.uniformLocations.u_mouseDetect, 0);
        //me.storeObjectId = false;
        
        //me.gl.clearColor(0.3, 0.5, 0.9, 1.0);
        //me.renderOnce();
        
        return {'x': mouseX, 'y': mouseY, 'objectId': objectId, 'texCoordX': texCoordX, 'texCoordY': texCoordY};
    };
    
    this.renderOnce = function()
    {
        var gl = me.gl;
        var time = (new Date()).getTime();
        
        me.checkResize();
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        me.resetFaceColorsAndTextureMultipliers();
        
        me.resetCameraMatrix();
        
        me.room.render(gl, time);
    };
    
    this.renderLoop = function()
    {
        me.gl.clearColor(me.backgroundColor.r / 255.0, me.backgroundColor.g / 255.0, me.backgroundColor.b / 255.0, 1.0);
        me.renderOnce();
        
        if(me.animateWithKey)
        {
            me.animateWithKey();
        }
        
        if(!me.stopRenderLoop)
        {
            requestAnimationFrame(me.renderLoop);
        }
    };
    
    me.load();
    me.renderLoop();
}
