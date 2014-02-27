function Canvas(id){
    this.ctx=document.getElementById(id).getContext('2d');
    this.ctx.lineWidth=2;
}

Canvas.prototype.rings=function(x,y,innerR,num,emptyNum){
    var radian=2*Math.PI/num;
    for(var i=0;i<num;i++){
        this.ctx.beginPath();
        this.ctx.arc(x,y,innerR,i*radian,(i+1)*radian,false);
        this.ctx.arc(x,y,innerR+10,(i+1)*radian,i*radian,true);
        this.ctx.closePath();
        if(i<(num-emptyNum)){
            this.ctx.fillStyle='#ff0000';
            this.ctx.fill();
        }
        this.ctx.stroke();
    }
};

Canvas.prototype.text=function(x,y,text,size){
    if(size){
        this.ctx.font=size+'px sans-serif';
    }else{
    	this.ctx.font='12px sans-serif';
    }
    this.ctx.fillStyle="#000000";
    var texts=text.split('\n');
    for(var i=0,len=texts.length;i<len;i++){
	    this.ctx.fillText(texts[i],x,y+size*i);
    }
};

Canvas.prototype.hArrow=function(startX,endX,y){
    this.ctx.beginPath();
    this.ctx.moveTo(startX,y);
    this.ctx.lineTo(endX,y);

    var x=(startX<endX)?endX-10:endX+10;
    this.ctx.moveTo(endX,y);
    this.ctx.lineTo(x,y+5);

    this.ctx.moveTo(endX,y);
    this.ctx.lineTo(x,y-5);

    this.ctx.stroke();
};

Canvas.prototype.rec=function(x1,y1,x2,y2){
	this.ctx.strokeRect(x1,y1,x2,y2);
};

var cv=new Canvas('canvas1');
cv.text(20,70,'RRD中有若干个存储数据的环状结构：',16);
cv.rec(300,10,300,140);
cv.rings(420,40,5,20,5);
cv.rings(380,80,20,40,25);
cv.rings(450,90,3,15,0);
cv.rings(520,60,25,50,40);

cv.text(20,210,'随着数据不断添加，\n这些环状结构逐渐被填满。\n当环状结构被填满之后，\n新加入的数据会覆盖最早的数据：',16);
cv.rings(350,220,40,50,45);
cv.hArrow(420,470,220);
cv.rings(540,220,40,50,30);
cv.hArrow(610,660,220);
cv.rings(730,220,40,50,10);
cv.hArrow(800,850,220);
cv.rings(920,220,40,50,0);

cv=new Canvas('canvas2');
cv.text(20,50,'第一个RRA记录每15\n秒钟计算CPU空闲率\n数据，保留80个数据，\n共覆盖20分钟的数据：',16);
cv.hArrow(200,250,80);
cv.rings(320,80,35,80,10);

cv.text(20,150,'第二个RRA记录每分\n钟计算CPU空闲率数\n据，保留120个数据，\n共覆盖2小时的数据：',16);
cv.hArrow(200,400,180);
cv.rings(550,150,120,120,110);
