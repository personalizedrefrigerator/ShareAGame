
function Vector3(x, y, z)
{
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    
    this.height = 3;
    this.width = 1;
    
    var me = this;
    
    this.zAngle = function()
    {
        if(Math.floor(me.x * 500) !== 0)
        {
            return Math.tan(me.y / me.x);
        }
        else
        {
            return Math.PI / 2;
        }
    };
    
    this.dotAsFloat = function(other)
    {
        return me.x * other.x + me.y * other.y + me.z * other.z;
    };
    
    this.dot = function(other)
    {
        return new Vector3(me.x * other.x, me.y * other.y, me.z * other.z);
    };
    
    this.dotProduct = this.dot;
    
    this.cross = function(other)
    {
        var result = new Vector3(0.0);
        result.x = me.y * other.z - me.z * other.y;
        result.y = me.z * other.x - me.x * other.z;
        result.z = me.x * other.y - me.y * other.x;
        
        return result;
    };
    
    this.crossProduct = this.cross;
    
    this.add = function(other)
    {
        return new Vector3(me.x + other.x, me.y + other.y, me.z + other.z);
    };
    
    this.subtract = function(other)
    {
        return new Vector3(me.x - other.x, me.y - other.y, me.z - other.z);
    };
    
    this.multipliedByScalar = function(k)
    {
        return new Vector3(me.x * k, me.y * k, me.z * k);
    };
    
    this.multiplyScalar = function(k)
    {
        me.x *= k;
        me.y *= k;
        me.z *= k;
    };
    
    this.getAt = function(x, y)
    {
        if(y !== undefined)
        {
            x = y;
        }
    
        //return me.toArray()[x];
        if(x === 0)
        {
            return me.x;
        }
        else if (x === 1)
        {
            return me.y;
        }
        
        return me.z;
    };
    
    this.getMagnitude = function()
    {
        return Math.sqrt( me.x * me.x + me.y * me.y + me.z * me.z );
    };
    
    this.normalize = function()
    {
        var magnitude = me.getMagnitude();
        
        if(magnitude !== 0)
        {
            me.multiplyScalar(1 / magnitude);
        }
        else
        {
            me.multiplyScalar(0);
        }
        
        return me;
    };

    this.toString = function()
    {
        return "<" + me.x + ", " + me.y + ", " + me.z + ">";
    };
    
    this.copy = function()
    {
        return new Vector3(me.x, me.y, me.z);
    };
    
    this.toArray = function()
    {
        return [me.x, me.y, me.z];
    };
}

function Vector4(x, y, z, w)
{
    Vector3.call(this, x, y, z);
    this.w = w;
    
    this.height = 4;
    
    var me = this;
    

    this.toString = function()
    {
        return "<" + me.x + ", " + me.y + ", " + me.z + "," + me.w + ">";
    };
    
    this.toArray = function()
    {
        return [me.x, me.y, me.z, me.w];
    };
    
    this.copy = function()
    {
        return new Vector4(me.x, me.y, me.z, me.w);
    };
    
    this.dot = function(other)
    {
        return new Vector4(me.x * other.x, me.y * other.y, me.z * other.z, me.w * other.w);
    };
    
    this.dotAsFloat = function(other)
    {
        return me.x * other.x + me.y * other.y + me.z * other.z + me.w * other.w;
    };
    
    this.dotProduct = this.dot;
    
    this.cross = function(other)
    {
        var result = new Vector4(0.0);
        result.x = me.y * other.z - me.z * other.y;
        result.y = me.z * other.x - me.x * other.z;
        result.z = me.x * other.y - me.y * other.x;
        result.w = me.x * other.y - me.y * other.x;
        
        throw "NOT IMPLEMENTED FOR VEC4!";
        
        return result;
    };
    
    this.crossProduct = this.cross;
    
    this.add = function(other)
    {
        return new Vector4(me.x + other.x, me.y + other.y, me.z + other.z, me.w + other.w);
    };
    
    this.subtract = function(other)
    {
        return new Vector4(me.x - other.x, me.y - other.y, me.z - other.z, me.w - other.w);
    };
    
    this.multipliedByScalar = function(k)
    {
        return new Vector4(me.x * k, me.y * k, me.z * k, me.w * k);
    };
    
    this.multiplyScalar = function(k)
    {
        me.x *= k;
        me.y *= k;
        me.z *= k;
        me.w *= k;
    };
    
    this.getAt = function(x, y)
    {
        if(y !== undefined)
        {
            x = y;
        }
    
        //return me.toArray()[x];
        if(x === 0)
        {
            return me.x;
        }
        else if (x === 1)
        {
            return me.y;
        }
        else if (x === 2)
        {
            return me.z;
        }
        
        return me.w;
    };
    
    this.getMagnitude = function()
    {
        return Math.sqrt( me.x * me.x + me.y * me.y + me.z * me.z + me.w * me.w );
    };
}
