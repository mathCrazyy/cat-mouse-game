class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.lives = 5;
        this.scoreElement = document.getElementById('scoreValue');
        this.livesElement = document.getElementById('livesValue');
        this.loadingElement = document.getElementById('loading');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        
        // 速度控制元素
        this.catSpeedInput = document.getElementById('catSpeed');
        this.mouseSpeedInput = document.getElementById('mouseSpeed');
        this.catSpeedValue = document.getElementById('catSpeedValue');
        this.mouseSpeedValue = document.getElementById('mouseSpeedValue');
        
        // 目标尺寸
        this.targetSizes = {
            cat: { width: 80, height: 80 },
            mouse: { width: 40, height: 40 },
            bomb: { width: 30, height: 30 }
        };
        
        // 加载图片
        this.images = {
            cat: new Image(),
            mouse: new Image(),
            bomb: new Image()
        };
        
        // 设置图片加载超时
        const LOAD_TIMEOUT = 5000; // 5秒超时
        
        // 创建加载Promise
        const loadImage = (img, src) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`加载超时: ${src}`));
                }, LOAD_TIMEOUT);
                
                img.onload = () => {
                    clearTimeout(timeout);
                    console.log(`图片加载成功: ${src}`);
                    resolve();
                };
                
                img.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error(`图片加载失败: ${src}`, error);
                    reject(new Error(`加载失败: ${src}`));
                };
                
                console.log(`开始加载图片: ${src}`);
                img.src = src;
            });
        };
        
        // 更新加载状态
        const updateLoadingStatus = (status) => {
            console.log(`加载状态: ${status}`);
            this.loadingElement.textContent = status;
        };
        
        // 加载所有图片
        Promise.all([
            loadImage(this.images.cat, 'images/cat.png'),
            loadImage(this.images.mouse, 'images/mouse.png'),
            loadImage(this.images.bomb, 'images/bomb.png')
        ]).then(() => {
            updateLoadingStatus('游戏加载完成！');
            setTimeout(() => {
                this.loadingElement.style.display = 'none';
                this.startGame();
            }, 500);
        }).catch(error => {
            updateLoadingStatus(`加载失败: ${error.message}`);
            console.error('图片加载错误:', error);
        });
    }
    
    startGame() {
        console.log('开始游戏');
        // 优化图片尺寸
        const optimizeImageSize = (img, targetSize) => {
            const scale = Math.min(
                targetSize.width / img.width,
                targetSize.height / img.height
            );
            return {
                width: img.width * scale,
                height: img.height * scale
            };
        };
        
        // 猫的属性
        const catSize = optimizeImageSize(this.images.cat, this.targetSizes.cat);
        console.log('猫的尺寸:', catSize);
        this.cat = {
            x: 400,
            y: 300,
            width: catSize.width,
            height: catSize.height,
            speed: parseInt(this.catSpeedInput.value),
            originalWidth: this.images.cat.width,
            originalHeight: this.images.cat.height
        };
        
        // 老鼠的属性
        const mouseSize = optimizeImageSize(this.images.mouse, this.targetSizes.mouse);
        console.log('老鼠的尺寸:', mouseSize);
        this.mouse = {
            x: Math.random() * (this.canvas.width - mouseSize.width),
            y: Math.random() * (this.canvas.height - mouseSize.height),
            width: mouseSize.width,
            height: mouseSize.height,
            speed: parseInt(this.mouseSpeedInput.value),
            originalWidth: this.images.mouse.width,
            originalHeight: this.images.mouse.height,
            targetX: 0,
            targetY: 0,
            changeDirectionTime: 0
        };
        
        // 初始化炸弹尺寸
        const bombSize = optimizeImageSize(this.images.bomb, this.targetSizes.bomb);
        this.bombSize = {
            width: bombSize.width,
            height: bombSize.height,
            originalWidth: this.images.bomb.width,
            originalHeight: this.images.bomb.height
        };
        
        // 炸弹数组
        this.bombs = [];
        this.lastBombTime = 0;
        this.bombInterval = 2000; // 每2秒生成一个炸弹
        
        // 绑定速度控制事件
        this.catSpeedInput.addEventListener('input', () => {
            this.cat.speed = parseInt(this.catSpeedInput.value);
            this.catSpeedValue.textContent = this.cat.speed;
        });
        
        this.mouseSpeedInput.addEventListener('input', () => {
            this.mouse.speed = parseInt(this.mouseSpeedInput.value);
            this.mouseSpeedValue.textContent = this.mouse.speed;
        });
        
        // 使用 requestAnimationFrame 节流
        let lastTime = 0;
        const FPS = 60;
        const frameInterval = 1000 / FPS;
        
        // 绑定事件监听器（使用节流）
        let lastMouseMove = 0;
        this.canvas.addEventListener('mousemove', (event) => {
            const now = Date.now();
            if (now - lastMouseMove >= 16) { // 约60fps
                this.handleMouseMove(event);
                lastMouseMove = now;
            }
        });
        
        // 优化游戏循环
        this.gameLoop = (timestamp) => {
            if (!lastTime) lastTime = timestamp;
            const deltaTime = timestamp - lastTime;
            
            if (deltaTime >= frameInterval) {
                this.update(deltaTime);
                this.draw();
                lastTime = timestamp;
            }
            
            requestAnimationFrame(this.gameLoop);
        };
        
        // 开始游戏循环
        requestAnimationFrame(this.gameLoop);
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // 直接更新猫的位置，提高响应速度
        this.cat.x = mouseX;
        this.cat.y = mouseY;
    }
    
    createBomb() {
        return {
            x: Math.random() * (this.canvas.width - this.bombSize.width),
            y: this.canvas.height,
            width: this.bombSize.width,
            height: this.bombSize.height,
            speed: 2,
            originalWidth: this.bombSize.originalWidth,
            originalHeight: this.bombSize.originalHeight
        };
    }
    
    update(deltaTime) {
        // 根据时间差调整移动速度
        const speedMultiplier = deltaTime / 16.67; // 基准帧率16.67ms
        
        // 生成炸弹
        const now = Date.now();
        if (now - this.lastBombTime > this.bombInterval) {
            this.bombs.push(this.createBomb());
            this.lastBombTime = now;
        }
        
        // 更新炸弹位置
        this.bombs = this.bombs.filter(bomb => {
            bomb.y -= bomb.speed * speedMultiplier;
            return bomb.y > -bomb.height; // 移除超出屏幕的炸弹
        });
        
        // 更新老鼠的目标位置
        if (now - this.mouse.changeDirectionTime > 1000) { // 每秒改变一次方向
            this.mouse.targetX = Math.random() * this.canvas.width;
            this.mouse.targetY = Math.random() * this.canvas.height;
            this.mouse.changeDirectionTime = now;
        }
        
        // 计算老鼠到目标位置的方向
        const dx = this.mouse.targetX - this.mouse.x;
        const dy = this.mouse.targetY - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            // 移动老鼠
            this.mouse.x += (dx / distance) * this.mouse.speed * speedMultiplier;
            this.mouse.y += (dy / distance) * this.mouse.speed * speedMultiplier;
        }
        
        // 确保老鼠不会离开画布
        this.mouse.x = Math.max(0, Math.min(this.canvas.width - this.mouse.width, this.mouse.x));
        this.mouse.y = Math.max(0, Math.min(this.canvas.height - this.mouse.height, this.mouse.y));
        
        // 检测与老鼠的碰撞
        const catDx = this.cat.x - this.mouse.x;
        const catDy = this.cat.y - this.mouse.y;
        const catDistance = Math.sqrt(catDx * catDx + catDy * catDy);
        
        if (catDistance < (this.cat.width + this.mouse.width) / 3) {
            // 抓到老鼠
            this.score += 10;
            this.scoreElement.textContent = this.score;
            
            // 重置老鼠位置
            this.mouse.x = Math.random() * (this.canvas.width - this.mouse.width);
            this.mouse.y = Math.random() * (this.canvas.height - this.mouse.height);
            this.mouse.targetX = this.mouse.x;
            this.mouse.targetY = this.mouse.y;
        }
        
        // 检测与炸弹的碰撞
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            const bombDx = this.cat.x - bomb.x;
            const bombDy = this.cat.y - bomb.y;
            const bombDistance = Math.sqrt(bombDx * bombDx + bombDy * bombDy);
            
            if (bombDistance < (this.cat.width + bomb.width) / 3) {
                // 碰到炸弹
                this.score = Math.max(0, this.score - 10);
                this.lives--;
                this.scoreElement.textContent = this.score;
                this.livesElement.textContent = this.lives;
                
                // 移除炸弹
                this.bombs.splice(i, 1);
                
                // 检查游戏是否结束
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        }
    }
    
    gameOver() {
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'block';
    }
    
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 如果图片加载失败，绘制基本形状
        if (!this.images.cat.complete || !this.images.mouse.complete || !this.images.bomb.complete) {
            // 绘制猫（红色圆形）
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            this.ctx.arc(this.cat.x, this.cat.y, 40, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制老鼠（蓝色圆形）
            this.ctx.fillStyle = 'blue';
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 20, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 绘制炸弹（黑色圆形）
            this.bombs.forEach(bomb => {
                this.ctx.fillStyle = 'black';
                this.ctx.beginPath();
                this.ctx.arc(bomb.x, bomb.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
            });
            return;
        }
        
        // 如果图片加载成功，绘制图片
        try {
            // 绘制猫
            this.ctx.drawImage(
                this.images.cat,
                0, 0, this.cat.originalWidth, this.cat.originalHeight,
                this.cat.x - this.cat.width / 2,
                this.cat.y - this.cat.height / 2,
                this.cat.width,
                this.cat.height
            );
            
            // 绘制老鼠
            this.ctx.drawImage(
                this.images.mouse,
                0, 0, this.mouse.originalWidth, this.mouse.originalHeight,
                this.mouse.x - this.mouse.width / 2,
                this.mouse.y - this.mouse.height / 2,
                this.mouse.width,
                this.mouse.height
            );
            
            // 绘制炸弹
            this.bombs.forEach(bomb => {
                this.ctx.drawImage(
                    this.images.bomb,
                    0, 0, this.bombSize.originalWidth, this.bombSize.originalHeight,
                    bomb.x - this.bombSize.width / 2,
                    bomb.y - this.bombSize.height / 2,
                    this.bombSize.width,
                    this.bombSize.height
                );
            });
        } catch (error) {
            console.error('绘制图片时出错:', error);
        }
    }
}

// 当页面加载完成后启动游戏
window.onload = () => {
    console.log('页面加载完成，开始初始化游戏');
    new Game();
}; 