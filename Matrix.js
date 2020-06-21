function Matrix(width, height)
{
 this.columns=[];
 this.width=width || 2;
 this.height=height || width;
 
 this.saves = [];

 var me=this;

 var createSelf=function()
 {
  var currentColumn=[];
  for(var x=0; x<me.width; x++)
  {
   currentColumn=[];
   for(var y=0; y<me.height; y++)
   {
    currentColumn.push(0.0);
   }
   me.columns.push(currentColumn);
  }
 }; 
 
 createSelf();

 this.toIdentityMatrix=function()
 {
  for(var x=0; x<me.width; x++)
  {
   for(var y=0; y<me.height; y++)
   {
    me.setAt(x == y?1:0, x, y);
   }
  }
 };

 this.setAt=function(setTo, x, y)
 {
  me.columns[x][y]=setTo;
 };

 this.getAt=function(x, y)
 {
  return me.columns[x][y];
 };
 
 this.swap=function(x1, y1, x2, y2)
 {
  var tempX2=me.getAt(x1, y1);
  me.setAt(me.getAt(x2, y2), x1, y1);
  me.setAt(tempX2, x2, y2);
 };

 this.fromColumnsArray=function(array)
 {
  if(array.length !== me.height)
  {
   console.warn("This will cause an error. In: Matrix.fromColumnsArray(array).\narray.length="+array.length+", me.height="+me.height+"\nme.width="+me.width+"."
   + " " + array);
  }
  for(var x=0; x<me.width; x++)
  {
   for(var y=0; y<me.height; y++)
   {
    me.setAt(array[x][y], x, y);
   }
  }
 };
 
 this.copy = function()
 {
    var result = new Matrix(me.width, me.height);
    result.from1DArray(me.to1DArray());
    
    return result;
 };

 this.transpose=function()
 {
  if(me.width === me.height)
  {
      //Swap positions accross the diagonal.
      for(var x=0; x < me.width; x++)
      {
       for(var y=0; y < x; y++)
       {
        me.swap(x, y, y, x);
       }
      }
  }
  else
  {
    var copy = me.copy();
    
    var oldWidth = me.width * 1;
    me.width = me.height;
    me.height = oldWidth;
    
    me.columns = [];
    
    createSelf();
    
    var y;
    for(var x = 0; x < me.width; x++)
    {
        for(y = 0; y < me.height; y++)
        {
            me.setAt(copy.getAt(y, x), x, y);
        }
    }
  }
  
  return me;
 };

 this.getDeterminant=function()
 {
  // If a 2 by 2 matrix ...
  if(me.width === 2 && me.height === 2)
  {
   return me.getAt(0, 0) * me.getAt(1, 1) - me.getAt(1, 0) * me.getAt(0, 1);
  }
  else if(me.width === 1 && me.height === 1)
  {
   return me.getAt(0, 0);
  }
  else if(me.width > 2 && me.height > 2)
  {
   // Cover up each of the elements in the 1st row. Find the determinant of those.
   var determinantAccumulator=0;
   var multiplier=1;
   var smallerMatrix=new Matrix(me.width-1, me.height-1);
   var currentColumn=[];
   for(var i = 0; i<me.width; i++)
   {
    var currentColumns=[];
    for(var x=0; x<me.width; x++)
    {
     if(x === i)
     {
      continue;
     }
     currentColumn=[];
     for(var y=1; y<me.height; y++)
     {
      currentColumn.push(me.getAt(x, y));
     }
     currentColumns.push(currentColumn);
    }
    //console.warn(currentColumns);
    //smallerMatrix=new Matrix(me.width-1, me.height-1);
    smallerMatrix.fromColumnsArray(currentColumns);
    determinantAccumulator+=multiplier*me.getAt(i, 0)*smallerMatrix.getDeterminant();
    multiplier*=-1;
   }
   me.determinant=determinantAccumulator;
   return determinantAccumulator;
  }
  return 1;
 };

 this.getCopy=function()
 {
  var newColumns=[];
  for(var x=0; x<me.width; x++)
  {
   var currentColumn=[];
   for(var y=0; y<me.height; y++)
   {
    currentColumn.push(me.getAt(x, y));
   }
   newColumns.push(currentColumn);
  }
  var newMatrix=new Matrix(me.width, me.height);
  newMatrix.fromColumnsArray(newColumns);

  return newMatrix;
 };

 this.getMatrixOfMinors=function()
 {
  var matrixOfMinors=new Matrix(me.width, me.height);
  for(var x=0; x<me.width; x++)
  {
   for(var y=0; y<me.height; y++)
   {
    var currentMatrixColumns=[];
    for(var x2=0; x2<me.width; x2++)
    {
     if(x2 === x)
     {
      continue;
     }
     var currentColumn=[];
     for(var y2=0; y2<me.height; y2++)
     {
      if(y2 === y)
      {
       continue;
      }
      currentColumn.push(me.getAt(x2, y2));
     }
     currentMatrixColumns.push(currentColumn);
    }
    var matrix=new Matrix(me.width-1, me.height-1);
    matrix.fromColumnsArray(currentMatrixColumns);
    var determinant=matrix.getDeterminant();
    
    matrixOfMinors.setAt(determinant, x, y);
   }
  }
  return matrixOfMinors;
 };

 this.getMatrixOfCofactors=function()
 {
  var matrixOfMinors=me.getMatrixOfMinors();
  var multiplier=1;
  for(var x=0; x<matrixOfMinors.width; x++)
  {
   for(var y=0; y<matrixOfMinors.height; y++)
   {
    if(x % 2 === y % 2)
    {
     multiplier=1;
    }
    else
    {
     multiplier=-1;
    }

    matrixOfMinors.setAt(matrixOfMinors.getAt(x, y)*multiplier, x, y);
   }
  }
  return matrixOfMinors; // Now the matrix of cofactors.
 };

 // This method is slow! Don't use it!
 this.getInverseMethod2=function()
 {
  var matrixOfCofactors=me.getMatrixOfCofactors();
  matrixOfCofactors.transpose();
  var determinant=me.getDeterminant();
  matrixOfCofactors.multiplyByConstant(1/determinant);
  return matrixOfCofactors;
 };

 this.setRow=function(rowContent, rowY)
 {
  for(var x=0; x<me.width; x++)
  {
   me.setAt(rowContent[x], x, rowY);
  }
 };

 this.getRow=function(y)
 {
  var row=[];
  for(var x=0; x<me.width; x++)
  {
   row.push(me.getAt(x, y));
  }

  return row;
 };

 this.swapRows=function(y1, y2)
 {
  var row1=me.getRow(y1);
  var row2=me.getRow(y2);
  
  me.setRow(row1, y2);
  me.setRow(row2, y1);
 };
 
 this.multiplyRowByConstant=function(rowY, k)
 {
  for(var x=0; x<me.width; x++)
  {
   me.setAt(me.getAt(x, rowY)*k, x, rowY);
  }
 };

 this.addMultipleOfRow=function(y1, y2, k1, k2)
 {
  for(var x=0; x<me.width; x++)
  {
   me.setAt(me.getAt(x, y1)*k1+me.getAt(x, y2)*k2, x, y1);
  }
 };

 this.getInverse=function()
 {
  // Swap rows and columns, multiplying by multiples of rows and constants as appropriate.
  var left=me.getCopy();
  var right=new Matrix(me.width, me.height);

  right.toIdentityMatrix();

  // Make the diagonal 1, then add and subtract multiples to make the others in the same row 0.
  //Preform both opperations on the left and the right.
  var piviotX=0;
  var piviotY=0;

  var k;
  var piviotValue;

  while(piviotX < right.width && piviotY < right.height)
  {
   // Make the piviot value 1.
   piviotValue=left.getAt(piviotX, piviotY);
   k=1/piviotValue;
   left.multiplyRowByConstant(piviotY, k);
   right.multiplyRowByConstant(piviotY, k);
   
   //console.log(left.toString());
   

   // Make the others in the same row 0.
   for(var y=0; y<left.height; y++)
   {
    if(y != piviotY)
    {
     k=-left.getAt(piviotX, y);
     left.addMultipleOfRow(y, piviotY, 1, k);
     right.addMultipleOfRow(y, piviotY, 1, k);
    }
   }

   piviotX++;
   piviotY++;
  }
  return right;
 };

 this.multiplyByConstant=function(c)
 {
  for(var x=0; x<me.width; x++)
  {
   for(var y=0; y<me.height; y++)
   {
    me.setAt(me.getAt(x, y)*c, x, y);
   }
  }
 };

 this.multiplyMatrix=function(other) // This one before the other.
 {
  if(other.height === me.width)
  {
   var newMatrix=new Matrix(other.width, me.height);
   for(var y1=0; y1<me.height; y1++)
   {
    for(var y2=0; y2<other.width; y2++)
    {
     var total=0;
     for(var x=0; x<me.width; x++)
     {
      total+=me.getAt(x, y1)*other.getAt(y2, x);
     }
     newMatrix.setAt(total, y2, y1);
    }
   }
   return newMatrix;
  }
 };
 
 this.multiply = function(other)
 {
    return me.multiplyMatrix(other);
 };
 
 this.transformVector = function(vector)
 {
    var multiplyBy = new Matrix(1, me.width);
    
    if(vector.width === 3)
    {
        multiplyBy.setAt(1, 0, 3);
    }
    
    multiplyBy.from1DArray(vector.toArray());
    
    var result = me.getCopy().transpose().multiply(multiplyBy);
    
    vector.x = result.getAt(0, 0);
    vector.y = result.getAt(0, 1);
    
    if(vector.height >= 3)
    {
        vector.z = result.getAt(0, 2);
    }
    
    if(vector.height >= 4)
    {
        vector.w = result.getAt(0, 3);
    }
 };
 
 this.reverseMultiplyAndSet = function(other)
 {
    var result = other.multiplyMatrix(me);
    
    me.width = result.width;
    me.height = result.height;
    
    me.columns = result.columns;
 };
 
 this.multiplyAndSet = function(other)
 {
    var result = me.multiplyMatrix(other);
    
    me.width = result.width;
    me.height = result.height;
    
    me.columns = result.columns;
 };
 
 var preOrPostMultiplyAndSet = function(other, prepend)
 {
    if(prepend)
    {
        //var temp = other.getCopy().transpose();
        //me.transpose();
        
        me.reverseMultiplyAndSet(other);
    }
    else
    {
        me.multiplyAndSet(other);
    }
 };
 
 this.rotate = function(theta, prepend)
 {
    var sine = Math.sin(theta);
    var cosine = Math.cos(theta);
    
    var other = new Matrix(me.height, me.width);
    other.toIdentityMatrix();
    
    other.setAt(cosine, 0, 0);
    other.setAt(sine, 0, 1);
    other.setAt(-sine, 1, 0);
    other.setAt(cosine, 1, 1);
    
    preOrPostMultiplyAndSet(other, prepend);
 };
 
 this.rotateY = function(theta, prepend)
 {
    var sine = Math.sin(theta);
    var cosine = Math.cos(theta);
    
    var other = new Matrix(me.height, me.width);
    other.toIdentityMatrix();
    
    other.setAt(cosine, 0, 0);
    other.setAt(sine, 2, 0);
    
    other.setAt(-sine, 0, 2);
    other.setAt(cosine, 2, 2);
    
    preOrPostMultiplyAndSet(other, prepend);
 };
 
 this.rotateX = function(theta, prepend)
 {
    var sine = Math.sin(theta);
    var cosine = Math.cos(theta);
    
    var other = new Matrix(me.height, me.width);
    other.toIdentityMatrix();
    
    other.setAt(cosine, 1, 1);
    other.setAt(sine, 2, 1);
    
    other.setAt(-sine, 1, 2);
    other.setAt(cosine, 2, 2);
    
    preOrPostMultiplyAndSet(other, prepend);
 };
 
 this.rotateZ = this.rotate;
 
 this.scale = function(x, y, z, prepend)
 {
    if(z === undefined)
    {
        z = 1;
    }
    
    var other = new Matrix(me.height, me.width);
    other.toIdentityMatrix();
    
    other.setAt(x, 0, 0);
    
    if(y !== undefined)
    {
        other.setAt(y, 1, 1);
    }
    
    if(z !== undefined)
    {
        other.setAt(z, 2, 2);
    }
    
    preOrPostMultiplyAndSet(other, prepend);
 };
 
 this.translate = function(dx, dy, dz, prepend)
 {
    if(dz === undefined)
    {
        dz = 1;
    }
    
    var other = new Matrix(me.height, me.width);
 
    other.toIdentityMatrix();
    
    other.setAt(dx, 0, me.width - 1);
    other.setAt(dy, 1, me.width - 1);
    other.setAt(dz, 2, me.width - 1);
    
    preOrPostMultiplyAndSet(other, prepend);
 };
 
 this.translateByVector = function(vector, prepend)
 {
    me.translate(vector.x, vector.y, vector.z, prepend);
 };
 
 this.to1DArray = function()
 {
    var result = [];
    
    var x;
    for(var y = 0; y < me.height; y++)
    {
        for(x = 0; x < me.width; x++)
        {
            result.push(me.getAt(x, y));
        }
    }
    
    return result;
 };
 
 this.from1DArray = function(array)
 {
    var x, y;
    
    for(var i = 0; i < array.length; i++)
    {
        x = i % me.width;
        y = Math.floor(i / me.width);
        
        me.setAt(array[i], x, y);
    }
    
    return me;
 };

 this.save = function()
 {
    if(me.saves.length < 100)
    {
        me.saves.push(me.to1DArray());
    }
    else
    {
        throw "Saves too long!";
    }
 };
 
 this.restore = function()
 {
    if(me.saves.length > 0)
    {
        var save = me.saves.pop();
        
        me.from1DArray(save);
    }
    else
    {
        throw "No saved state to restore!";
    }
 };

 this.toString=function(roundToDecimalPlaces)
 {
  var result="_\n";
  for(var y=0; y<me.height; y++)
  {
   result+="|";
   for(var x=0; x<me.width; x++)
   {
    var currentValue=me.getAt(x, y);
    if(roundToDecimalPlaces !== undefined)
    {
     currentValue=Math.round(currentValue*Math.pow(10, roundToDecimalPlaces))/Math.pow(10, roundToDecimalPlaces);
    }
    result+=currentValue+", ";
   }
   result+="\n";
  }
  result+="-";
  return result;
 };
}

var Mat44Helper =
{
    "axisTransformMatrix": function(xAxis, yAxis, zAxis, origin, compat)
    {
        var result = new Matrix(4, 4);
        
        if(compat)
        {
            result.from1DArray(
            [
                xAxis.x, xAxis.y, xAxis.z, 0,
                yAxis.x, yAxis.y, yAxis.z, 0,
                zAxis.x, zAxis.y, zAxis.z, 0,
                origin.x, origin.y, origin.z, 1
            ]);
        }
        else
        {
            result.from1DArray(
            [
                xAxis.x, yAxis.x, zAxis.x, 0,
                xAxis.y, yAxis.y, zAxis.y, 0,
                xAxis.z, yAxis.z, zAxis.z, 0,
                origin.x, origin.y, origin.z, 1
            ]);
        }
        //result.transpose();
        
        return result;
    },
    
    "lookAt": function(cameraLocation, upVector, otherLocation, compat)
    {
        compat = compat === undefined ? true : false;
        var zAxis = otherLocation.subtract(cameraLocation);
        
        if(compat)
        {
            zAxis = cameraLocation.subtract(otherLocation);
        }
        
        var xAxis = zAxis.crossProduct(upVector);
        var yAxis = zAxis.crossProduct(xAxis);
        
        xAxis.normalize();
        yAxis.normalize();
        zAxis.normalize();
        
        return Mat44Helper.axisTransformMatrix(xAxis, yAxis, zAxis, cameraLocation, compat);
    },
    
    // Aspect is width / height.
    "perspective": function(fovY, zNear, zFar, aspect)
    {
        /*
            A reminder on how this works:
            
                    |  /|   |
               zMin | / |y  | zMax
                     /  |   |
                EYE /)A |------> -z
                      z
                
                Let A = fovY / 2.
                
                tan(A)         = maxY / (-zPos) <--- -zPos to convert the position along the z axis to distance from the camera.
                tan(A) * -zPos = maxY
                maxY           = tan(A) * -zPos
                
                To convert each point to clip-space, all of its components must be scaled from -1.0 to 1.0, so divided by the maximum amount, then a constant added.
                
                So, to scale from -1 to 1,
                y' = y_0 / maxY
                y' = y_0 / (tan(A) * -zPos).
                y' = y_0 / tan(A) 
                                    * (1 / (-zPos)) <----------- This section is handled by the -1 at (2, 3) (zero-indexed) in the matrix, as openGL automatically divides by w.
                
                and 
                
                x' = x_0 * convertToYAspect * k <------------ k is 1 / maxY
                x' = x_0 * aspect / maxY
                x' = x_0 * aspect / (tan(A) * -zPos)
                x' = x_0 * aspect / (tan(A)) * (1 / (-zPos))
                
                For the z position,
                clipZ = a / (-cameraZ) + b
                
                Use
                
                -1.0 = a / (-zNear) and 1.0 = a / (-zFar) + b
                
                to solve for a and b.
                
                Pull -camZ out abd put these into the matrix.
        */
        var result = new Matrix(4, 4);
        
        var tanResult = Math.tan(fovY / 2);
        
        var invTan = 1;
        
        // Handle division by zero.
        if(tanResult !== 0)
        {
            invTan /= tanResult;
        }
        else
        {
            invTan = 99999;
        }
        
        console.log("zNear: " + zNear + ", zFar: " + zFar);
        
        result.from1DArray(
        [
            aspect * invTan, 0,      0,                                0,
            0,               -invTan, 0,                                0,
            0,               0,      -(zNear - zFar) / (zNear + zFar), 2 * zNear * zFar / (zNear + zFar),
            0,               0,      -1,                               0
        ]);
        
        return result;
    }
};

var Matrix44Helper = Mat44Helper;
