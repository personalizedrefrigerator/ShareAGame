var object3D =
{
    "getCubeTexCoords": function(faceLocations)
    {
        faceLocations = faceLocations ||
        [
            [0, 1/4], // 1
            [1/4, 0], // 2
            [1/2, 1/4], // 3
            [1/4, 1/2], // 4
            [3/4, 1/4], // 5
            [1/4, 1/4], // 6
        ];
        
        var verticies = object3D.getScaledCubeVerticies(1);
        var texCoords = [];
        
        var normalizationConstant = 1.0/20;
        
        var currentLocation, verticiesStart;
        
        for(var i = 0; i < faceLocations.length; i++)
        {
            currentLocation = faceLocations[i];
            verticiesStart = i * 6 * 3;
            
            var lastComponents = [], doesChange;
            for(var j = verticiesStart; j < verticies.length && j < verticiesStart + 6 * 3; j += 3)
            {
                if(lastComponents.length === 0)
                {
                    doesChange = [false, false, false];
                }
                else
                {
                    for(var k = 0; k < lastComponents.length; k++)
                    {
                        if(lastComponents[k] !== verticies[j + k])
                        {
                            doesChange[k] = true;
                        }
                    }
                }
                lastComponents = [verticies[j], verticies[j + 1], verticies[j + 2]];
            }
            
            var unchanging = [];
            var countAdded = 0;
            
            for(var j = verticiesStart; j < verticies.length && j < verticiesStart + 6 * 3; j+=3)
            {
                for(var k = 0; k < 3; k++)
                {
                    if(doesChange[k])
                    {
                        //console.warn("K:" + k + ", j: " + j + ", verticies[j + k]: " + verticies[j + k]);
                    
                        unchanging.push(verticies[j + k]);
                        countAdded++;
                        
                        if(countAdded > 2)
                        {
                            console.warn("Index: " + j + ", k: " + k);
                            console.warn(unchanging);
                            console.warn(doesChange);
                            throw "Logic error! More than two verticies added (" + countAdded + ")! Something must be wrong.";
                        }
                    }
                }
                
                countAdded = 0;
            }
            
            console.warn(verticiesStart);
            console.warn(unchanging);
            console.warn(doesChange);
            
            for(var j = 0; j < unchanging.length; j += 2)
            {
                texCoords.push(unchanging[j] * normalizationConstant / 4 + currentLocation[0]);
                texCoords.push(unchanging[j + 1] * normalizationConstant / 4 + currentLocation[1]);
            }
        }
        
        return texCoords;
    },
    
    "cubeVerticies":
    [
        // Face 1
        20, 20, 0,
        20, 0, 0,
        0, 0, 0,
        
        20, 20, 0,
        0, 0, 0,
        0, 20, 0,
        
        // Face 2
        20, 0, 20,
        20, 20, 20,
        0, 20, 20,
        
        20, 0, 20,
        0, 20, 20,
        0, 0, 20,
        
        
        // Face 3
        
        0, 20, 0,
        0, 0, 0,
        0, 0, 20,
                
        0, 20, 0,
        0, 0, 20,
        0, 20, 20,
        
        // Face 4
        20, 0, 0,
        20, 20, 0,
        20, 20, 20,
        
        20, 0, 0,
        20, 20, 20,
        20, 0, 20,
        
        // Face 5
        20, 20, 20,
        20, 20, 0,
        0, 20, 0,
        
        20, 20, 20,
        0, 20, 0,
        0, 20, 20,
        
        // Face 6
        20, 0, 20,
        0, 0, 20,
        0, 0, 0,
        
        20, 0, 20,
        0, 0, 0, 
        20, 0, 0
    ],
    
    "getScaledCubeVerticies": function(scale)
    {
        var result = [];
        
        for(var i = 0; i < object3D.cubeVerticies.length; i++)
        {
            result.push(object3D.cubeVerticies[i] * scale);
        }
        
        return result;
    },
    
    "getTextureLocations": function(verticiesCount)
    {
        var locations = [];
        var points = [];
        var j;
        
        var face = 0;

        for(var i = 0; i < verticiesCount / 2; i++)
        {
            face = i;
            
            points = 
            [
                [0, 0],
                [0, 1],
                [1, 1],
                [0, 0],
                [1, 1],
                [1, 0]
            ];
            
            for(j = 0; j < points.length; j++)
            {
                if(face === 0 || face === 2)
                {
                    locations.push(1 - points[j][0]);
                    locations.push(1 - points[j][1]);
                }
                else
                {
                    locations.push(points[j][0]);
                    locations.push(points[j][1]);
                }
            }
        }
        
        return locations;
    },
    
    "getNormals": function(verticies, reOrder)
    {
        if(!Vector3)
        {
            throw "Error! Please include Vector.js.";
        }
        
        const triangleCount = verticies.length / 3 / 3;
        
        var normals = [];
        var vertex1, vertex2, vertex3;
        
        var firstVector, secondVector, thirdVector;
        var otherPoint1, otherPoint2;
        var currentPoints = [];
        
        var startIndex;
        
        for(var triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++)
        {
            startIndex = triangleIndex * 3 * 3;
            vertex1 = new Vector3(verticies[startIndex], verticies[startIndex + 1], verticies[startIndex + 2]);
            vertex2 = new Vector3(verticies[startIndex + 3], verticies[startIndex + 4], verticies[startIndex + 5]);
            vertex3 = new Vector3(verticies[startIndex + 6], verticies[startIndex + 7], verticies[startIndex + 8]);
            currentPoints = [vertex1, vertex2, vertex3];
            
            for(var i = 0; i < 3; i++)
            {
                otherPoint1 = currentPoints[(i + 1) % 3];
                otherPoint2 = currentPoints[(i + 2) % 3];
                firstVector = currentPoints[i].subtract(otherPoint1);
                secondVector = currentPoints[i].subtract(otherPoint2);
                
                if(!reOrder)
                {
                    thirdVector = firstVector.cross(secondVector);
                }
                else
                {
                    thirdVector = secondVector.cross(firstVector);
                }
                
                thirdVector.normalize();
                
                normals.push(thirdVector.x);
                normals.push(thirdVector.y);
                normals.push(thirdVector.z);
            }
        }
        
        return normals;
    }
};
