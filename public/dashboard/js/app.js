
function createSnowContainer() {
    if (!document.querySelector('.snow-container')) {
        const container = document.createElement('div');
        container.classList.add('snow-container');
        document.body.appendChild(container);
    }
    return document.querySelector('.snow-container');
}

function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.classList.add('snowflake');
    snowflake.innerHTML = '❄';
    
    const topOffset = Math.random() * 100 - 100; 
    snowflake.style.top = topOffset + 'px';
    snowflake.style.left = Math.random() * 100 + 'vw';
    
    const size = Math.random() * 8 + 8;
    snowflake.style.fontSize = size + 'px';
    
    const duration = Math.random() * 4 + 4;
    snowflake.style.animationDuration = duration + 's';
    
    const wobble = Math.random() * 50 - 25;
    snowflake.style.transform = `translateX(${wobble}px)`;
    snowflake.style.animationTimingFunction = `cubic-bezier(${Math.random()}, ${Math.random()}, ${Math.random()}, ${Math.random()})`;
    
    const container = createSnowContainer();
    container.appendChild(snowflake);
    
    setTimeout(() => {
        snowflake.remove();
    }, duration * 1000);
}

function startSnow() {
    for(let i = 0; i < 50; i++) { 
        setTimeout(createSnowflake, Math.random() * 2000);
    }
    
    
    setInterval(() => {
        for(let i = 0; i < 3; i++) { 
            createSnowflake();
        }
    }, 100); 
}

function stopSnow() {
    const container = document.querySelector('.snow-container');
    if (container) {
        container.remove();
    }
}


const toggleSnow = () => {
    const isSnowing = document.body.classList.toggle('snowing');
    if(isSnowing) {
        startSnow();
    } else {
        stopSnow();
    }
}

toggleSnow(); 