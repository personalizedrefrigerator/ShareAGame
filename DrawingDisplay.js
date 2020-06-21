function DrawingDisplay(src)
{
    this.src = src || "dw-";
    
    var me = this;
    
    this.setSrc = function(newSrc)
    {
        me.src = newSrc;
    };
    
    this.render = function(ctx)
    {
        if(me.src.search("dw-") !== 0 || me.src === "dw-")
        {
            return;
        }
    
        ctx.save();
        ctx.beginPath();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        var newPath = true;
        
        var maxX = 0;
        var maxY = 0;
        var updateMaxXY = function(x, y)
        {
            if(x > maxX)
            {
                maxX = x;
            }
            
            if(y > maxY)
            {
                maxY = y;
            }
        };
        
        var characterCommands = 
        {
            'c': function(argument, data, index)
            {
                ctx.strokeStyle = "#" + argument;
            },
            'C': function(argument)
            {
                ctx.fillStyle = "#" + argument;
            },
            'S': function(argument)
            {
                var sections = argument.split(',');
                
                if(sections.length > 3)
                {
                    ctx.strokeStyle = "rgba(" + sections.join(",") + ")";
                }
                else if(sections.length === 3)
                {
                    ctx.strokeStyle = "rgb(" + sections.join(",") + ")";
                }
            },
            'F': function(argument)
            {
                var sections = argument.split(',');
                
                if(sections.length > 3)
                {
                    ctx.fillStyle = "rgba(" + sections.join(",") + ")";
                }
                else if(sections.length === 3)
                {
                    ctx.fillStyle = "rgb(" + sections.join(",") + ")";
                }
            },
            'w': function(argument)
            {
                ctx.lineWidth = MathHelper.forceParseFloat(argument);
            },
            's': function(argument, data, index)
            {
                ctx.stroke();
            },
            'f': function(argument, data, index)
            {
                ctx.fill();
            },
            'm': function(argument)
            {
                var sections = argument.split(",");
                
                if(sections.length >= 2)
                {
                    var x = MathHelper.forceParseFloat(sections[0]),
                        y = MathHelper.forceParseFloat(sections[1]);
                    
                    if(!newPath)
                    {
                        ctx.lineTo(x, y);
                    }
                    else
                    {
                        ctx.moveTo(x, y);
                    }
                    
                    newPath = false;
                    
                    updateMaxXY(x, y);
                }
            },
            'b': function()
            {
                ctx.beginPath();
                
                var newPath = true;
            },
            'q': function(argument)
            {
                var sections = argument.split(",");
                
                if(sections.length >= 4)
                {
                    if(newPath)
                    {
                        ctx.moveTo(x1, y1);
                    }
                    
                    var x1 = MathHelper.forceParseFloat(sections[0]),
                        y1 = MathHelper.forceParseFloat(sections[1]);
                        
                    var x2 = MathHelper.forceParseFloat(sections[2]),
                        y2 = MathHelper.forceParseFloat(sections[3]);
                    
                    ctx.quadraticCurveTo(x1, y1, x2, y2);
                    newPath = false;
                    
                    updateMaxXY(x1, y1);
                    updateMaxXY(x2, y2);
                }
            }
        };
        
        const UNTIL_NEXT_COMMAND = -1;
        var argumentLengths = 
        {
            'c': 6,
            'C': 6,
            'S': UNTIL_NEXT_COMMAND,
            'F': UNTIL_NEXT_COMMAND,
            's': 0,
            'f': 0,
            'w': UNTIL_NEXT_COMMAND,
            'm': UNTIL_NEXT_COMMAND,
            'b': 0,
            'q': UNTIL_NEXT_COMMAND
        };
        
        var data = me.src.substring("dw-".length, me.src.length);
        data = data.replace(/[zZ]/g, "sbm");
        
        var currentCharacter;
        var chunkStartIndex = -1;
        var argumentLength = 0;
        var lastCommandCharacter = '';
        var endPosition;
        var argument;
        for(var index = 0; index <= data.length; index++)
        {
            if(index < data.length)
            {
                currentCharacter = data.charAt(index);
            }
            
            if(index === data.length
                    || ((argumentLength === UNTIL_NEXT_COMMAND || chunkStartIndex + argumentLength < index) && currentCharacter in characterCommands))
            {
                if(lastCommandCharacter !== "")
                {
                    endPosition = chunkStartIndex + argumentLength + 1;
                    
                    if(argumentLength === UNTIL_NEXT_COMMAND)
                    {
                        endPosition = index;
                    }
                    
                    argument = data.substring(chunkStartIndex + 1, endPosition);
                    characterCommands[lastCommandCharacter](argument, data, chunkStartIndex);
                }
                
                if(index < data.length)
                {
                    argumentLength = argumentLengths[currentCharacter];
                    chunkStartIndex = index;
                    lastCommandCharacter = currentCharacter;
                }
            }
        }
        
        ctx.restore();
        
        return {"width": maxX, "height": maxY};
    };
}

function DrawingEditor(parentElement, src, width, height)
{
    DrawingDisplay.call(this, src);
    this.onSrcChange = function(){};
    this.width = width || 200;
    this.height = height || 200;
    this.lastAction = undefined;
    this.actionSection = 0;
    this.parentElement = parentElement;
    this.lastSrc = this.src;
    var lastMouseX = 0;
    var lastMouseY = 0;
    this.undoBuffer = [];
    this.redoBuffer = [];
    
    var me = this;
    this.appendToSrc = function(newSection)
    {
        me.setSrc(me.src + newSection);
    };
    
    this.actions =
    {
        "lineTo": function(x, y)
        {
            me.appendToSrc("m" + x + "," + y);
        },
        "quadraticCurveTo": function(x, y)
        {
            if(me.actionSection === 0)
            {
                me.appendToSrc("q" + x + "," + y);
                me.actionSection = 1;
            }
            else
            {
                me.appendToSrc("," + x + "," + y);
                me.actionSection = 0;
            }
        }
    };
    
    me.lastAction = me.actions["lineTo"];
    
    this.setSrcChangeListener = function(listener)
    {
        me.onSrcChange = listener;
        
        listener(me.src);
    };
    
    this.setSrc = function(newSrc)
    {   
        me.lastSrc = me.src;
        me.undoBuffer.push(me.src);
        
        me.src = newSrc;
        
        if(me.onSrcChange)
        {
            me.onSrcChange(me.src);
        }
        
        me.ctx.clearRect(0, 0, me.width, me.height);
        me.render(me.ctx);
    };
    
    this.redo = function()
    {
        if(me.redoBuffer.length > 0)
        {
            me.setSrc(me.redoBuffer.pop());
        }
    };
    
    this.undo = function()
    {
        if(me.undoBuffer.length > 0)
        {
            me.setSrc(me.undoBuffer.pop());
            
            me.redoBuffer.push(me.undoBuffer.pop());
        }
    };
    
    this.loadButtons = function()
    {
        me.buttonsArea = document.createElement("div");
        
        var buttons = HTMLHelper.commandMapToButtons(
        {
            "Stroke": function()
            {
                me.appendToSrc("s");
            },
            "Fill": function()
            {
                me.appendToSrc("f");
            },
            "Set Fill Color": function()
            {
                var button = this;
                button.style.textShadow = "1px 0px 2px green";
                
                SubWindowHelper.promptForColor("Set Fill Color", "", [0, 0, 0, 1.0], function(red, green, blue, alpha)
                {
                    me.appendToSrc("F" + red + "," + green + "," + blue + "," + alpha);
                    button.style.backgroundColor = "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
                });
            },
            "Set Stroke Color": function()
            {
                var button = this;
                button.style.textShadow = "1px 0px 2px green";
                
                SubWindowHelper.promptForColor("Set Stroke Color", "", [0, 0, 0, 1.0], function(red, green, blue, alpha)
                {
                    me.appendToSrc("S" + red + "," + green + "," + blue + "," + alpha);
                    button.style.backgroundColor = "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
                });
            },
            "Line Width": function()
            {
                SubWindowHelper.prompt("Line Width", "Line width: ", "", function(newLineWidth)
                {
                    me.appendToSrc("w" + MathHelper.forceParseFloat(newLineWidth));
                }, "text");
            },
            "Line to": function()
            {
                me.lastAction = me.actions["lineTo"];
            },
            "Arc to": function()
            {
                me.lastAction = me.actions["quadraticCurveTo"];
            },
            "New Shape": function()
            {
                me.appendToSrc("b");
            },
            "Undo": function()
            {
                me.undo();
                me.drawGuidelines();
            },
            "Redo": function()
            {
                me.redo();
                me.drawGuidelines();
            },
            "Clear": function()
            {
                var button = this;
                
                if(button.innerHTML === "Clear")
                {
                    button.innerHTML = "Are you sure?";
                    
                    setTimeout(function()
                    {
                        button.innerHTML = "Clear";
                    }, 1000);
                }
                else
                {
                    me.setSrc("dw-");
                    me.undoBuffer = [];
                    me.redoBuffer = [];
                    
                    button.innerHTML = "Clear";
                }
            },
            "Help": function()
            {
                var helpWindow = SubWindowHelper.create({ title: "Drawer Help" });
                
                var helpContent = document.createElement("div");
                helpContent.setAttribute("class", "article");
                
                var firstParagraph = document.createElement("p");
                firstParagraph.style.textIndent = "15px";
                firstParagraph.innerHTML = "";
                
                HTMLHelper.addLabel("Abstract", helpContent, "h2");
                HTMLHelper.addLabel("A help manual on the sharable image-creator embedded within the character editor.", helpContent, "p");
                
                helpContent.appendChild(firstParagraph);
                
                HTMLHelper.addLabel("Troubleshooting", helpContent, "h2");
                HTMLHelper.addLabel("Why is nothing displaying when I click and drag the editor?", helpContent, "h3");
                
                HTMLHelper.addLabel("Unlike many drawing editors, instead of clicking and dragging, click one point, then another. Continue doing this to create a shape. To outline the shape, click stroke. Stroke outlines the shape.", helpContent, "p");
                
                HTMLHelper.addLabel("Why is nothing displaying when I click points on the editor, then fill or stroke?", helpContent, "h3");
                HTMLHelper.addLabel("Drawings created by the editor are prefixed by a &ldquo;<code>dw-</code>.&rdquo; Only drawings with this prefix will be displayed in the drawing editor. To save storage space, users must enter either an existing image URL, like &ldquo;https://share-dgame.firebaseapp.com/favicon.png,&rdquo; or save data for a drawing, like &ldquo;<code>dw-m10,10m100,100m50,80sf.</code>&rdquo; <b>Please reset the image by clicking the &ldquo;clear&rdquo; button!</b>", helpContent, "p");
                
                HTMLHelper.addLabel("What is the green line on the editor? Why does it not stay a part of the drawing when I click save?", helpContent, "h3");
                HTMLHelper.addLabel("The green line displayed in the editor is a preview of the shape, shown before the drawing is displayed using &ldquo;stroke&rdquo; or &ldquo;fill.&rdquo;", helpContent, "p");
                
                HTMLHelper.addLabel("Why does my drawing not save when I close the &ldquo;Edit Character&rdquo; window?", helpContent, "h3");
                HTMLHelper.addLabel("You may not have pressed save! Be sure to press save at the bottom left of the window before closing it! Similarly, the &ldquo;Image URL&rdquo; input content may be too long. This will create a &ldquo;PERMISSION_DENIED&rdquo; error.", helpContent, "p");
                
                HTMLHelper.addLabel("Why do I get a PERMISSION_DENIED error when trying to save my drawing?", helpContent, "h3");
                HTMLHelper.addLabel("The &ldquo;Image URL&rdquo; input content may be too long, or you might not have verified your email address. Either of these can create a permission denied error. This will create a &ldquo;PERMISSION_DENIED&rdquo; error. Try verifying your email address or removing sections of your image to save it.", helpContent, "p");
                
                HTMLHelper.addLabel("About the Save Format", helpContent, "h2");
                HTMLHelper.addLabel("Drawings are represented by &ldquo;<code>dw-</code>&rdquo; followed by letters that signify a command and arguments to that command. Often, a new letter runs a new command. For example, &ldquo;<code>dw-m100,50</code>&rdquo; adds a point to the drawing at (100, 50).", helpContent, "p");
                
                HTMLHelper.addLabel("After adding points to a drawing, one can &ldquo;stroke&rdquo; a line between the points, &ldquo;fill&rdquo; the shape or start a new shape. Unless the previous shape has been stroked or filled, it will be invisible. A stroke is represented by an &ldquo;s,&rdquo; a fill by an &ldquo;f,&rdquo; and a new shape by a &ldquo;b&rdquo; -- the &ldquo;b&rdquo; standing for &ldquo;<b>b</b>egin path.&rdquo;", helpContent, "p");
                
                HTMLHelper.addLabel("The &ldquo;Line to&rdquo and &ldquo;Arc to&rdquo; buttons switch between drawing a curve between or a line between points. An arc is represented by a &ldquo;q&rdquo; and should be followed by four comma separated values. For example, &ldquo;<code>dw-m0,0q10,10,20,50s</code>&rdquo; creates an arc, starting at (0, 0), bending near (10, 10), and ending at (20, 50). Move to or line to is represented by &ldquo;m&rdquo; and gives the first point of the arc (arcs take three points, the first, given by the end of the previous arc, or, at the beginning of a shape, a point that has been moved to). A &ldquo;w&rdquo; followed by a number will set the line width. Note that other commands exist, like &ldquo;F&ldquo; setting the fill color to a mixing of the red, green, and blue, with transparency as the fourth value.", helpContent, "p");
                
                HTMLHelper.addLabel("An Example", helpContent, "h3");
                
                var imageSrc = ("dw-m23,23q8,90,57,159m172,136m122,18m25,24sfF256,256,256,1" + "bm31,40m36,59m49,57m46,54m41,54m41,51m47,50m40,48m49,45m35,44f" + "bS256,256,256,1m62,46m56,59sm57,48m67,58s" + "bm84,49q71,53,80,58m85,50m89,61sbm98,53m96,60m104,50m107,65m114,54m117,68sm128,62m122,81m134,67" + "m134,77m130,77fbm141,75m132,88sbm144,87m152,92m147,83m140,100m151,105s");
                
                HTMLHelper.addLabel((imageSrc).split("b").join("<b>b</b>"), helpContent, "code");
                
                var imageContainer = HTMLHelper.addLabel("", helpContent, "div");
                
                CommunicationHelper.getImage(imageSrc, function(src, image)
                {
                    imageContainer.appendChild(image);
                });
                
                
                
                HTMLHelper.addLabel("Buttons", helpContent, "h2");
                HTMLHelper.addLabel("Be sure to click &ldquo;Stroke&ldquo; or &ldquo;Fill&ldquo; after creating a shape to display it! Read &ldquo;About the Save Format&rdquo; for more information.", helpContent, "p");
                
                helpWindow.appendChild(helpContent);
            }
        });
        
        me.buttonsArea.appendChild(buttons);
        me.parentElement.appendChild(me.buttonsArea);
    };
    
    this.drawGuidelines = function()
    {
        me.ctx.save();
        
        me.ctx.strokeStyle = "rgba(0, 255, 0, 0.6)";
        me.ctx.stroke();
        
        me.ctx.restore();
    };
    
    this.loadCanvas = function()
    {
        me.canvas = document.createElement("canvas");
        me.canvas.width = me.width;
        me.canvas.height = me.height;
        me.canvas.style.border = "1px solid red";
        me.canvas.style.boxShadow = "3px 4px rgba(0, 0, 0, 0.4)";
        
        me.ctx = me.canvas.getContext("2d");
        
        me.canvas.addEventListener("click", function(event)
        {
            var location = HTMLHelper.eventArgumentToElementXY(event, me.canvas);
            
            if(me.lastAction)
            {
                me.lastAction(Math.floor(location.x*2)/2, Math.floor(location.y*2)/2);
            }
                
            me.drawGuidelines();
            
            lastMouseX = location.x;
            lastMouseY = location.y;
        });
        
        me.parentElement.appendChild(me.canvas);
    };
    
    this.load = function()
    {
        me.loadButtons();
        me.loadCanvas();
        me.setSrc(me.src);
    };
    
    this.load();
}

