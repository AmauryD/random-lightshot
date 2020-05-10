$(document).ready(function () {
    let loading = false;
    const imageContainer = document.querySelector("#image");
    const statusText = document.querySelector("#statusText");
    const historyList = document.querySelector("#history");
    const imageUrl = document.querySelector("#image-url");
    const autoModeButton = document.querySelector("#autoModeBtn");
    const lightShotIdLength = 6;
    const lightShotUrl = "https://prnt.sc/";
    const proxyServer = "http://localhost:8080/";
    const body = document.querySelector("body");
    const progress = document.querySelector("#progress");
    const nigthModeBtn = document.querySelector("#nigth-mode");
    const childModeBtn = document.querySelector("#child-mode");
    const zoomContainer = document.querySelector("#img-zoom");
    let mode = "pause";
    let runLoopId = -1;
    const timeout = 3;

    autoModeButton.setAttribute("value","Start ⏯️");

    nigthModeBtn.addEventListener("click",() => {
        if (body.getAttribute("class") === "day") {
            body.setAttribute("class","night");
        }else{
            body.setAttribute("class","day");
        }
    });

    childModeBtn.addEventListener("click",() => {
        const classAttr = imageContainer.getAttribute("class");
        if (classAttr.includes("blurr")) {
            imageContainer.setAttribute("class",classAttr.replace("blurr","").trim());
        }else{
            imageContainer.setAttribute("class",`${classAttr} blurr`);
        }
    });

    function randomString(length, chars) {
        let result = '';
        for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }

    async function tryInfinite(promise,...args) {
        return promise(...args).catch(e => tryInfinite(promise,...args));
    }

    function imageZoom(img, result) {
        var img, lens, result, cx, cy;

        // delete old lens
        document.getElementById("lens")?.remove();

        /* Create lens: */
        lens = document.createElement("DIV");
        lens.setAttribute("id","lens");
        lens.setAttribute("class", "img-zoom-lens");
        /* Insert lens: */
        img.parentElement.insertBefore(lens, img);
        /* Calculate the ratio between result DIV and lens: */
        cx = result.offsetWidth / lens.offsetWidth;
        cy = result.offsetHeight / lens.offsetHeight;
        /* Set background properties for the result DIV */
        result.style.backgroundImage = "url('" + img.src + "')";
        result.style.backgroundSize = (img.width * cx) + "px " + (img.height * cy) + "px";
        /* Execute a function when someone moves the cursor over the image, or the lens: */
        lens.addEventListener("mousemove", moveLens);
        img.addEventListener("mousemove", moveLens);
        /* And also for touch screens: */
        lens.addEventListener("touchmove", moveLens);
        img.addEventListener("touchmove", moveLens);
        function moveLens(e) {
          var pos, x, y;
          /* Prevent any other actions that may occur when moving over the image */
          e.preventDefault();
          /* Get the cursor's x and y positions: */
          pos = getCursorPos(e);
          /* Calculate the position of the lens: */
          x = pos.x - (lens.offsetWidth / 2);
          y = pos.y - (lens.offsetHeight / 2);
          /* Prevent the lens from being positioned outside the image: */
          if (x > img.width - lens.offsetWidth) {x = img.width - lens.offsetWidth;}
          if (x < 0) {x = 0;}
          if (y > img.height - lens.offsetHeight) {y = img.height - lens.offsetHeight;}
          if (y < 0) {y = 0;}
          /* Set the position of the lens: */
          lens.style.left = x + "px";
          lens.style.top = y + "px";
          /* Display what the lens "sees": */
          result.style.backgroundPosition = "-" + (x * cx) + "px -" + (y * cy) + "px";
        }
        function getCursorPos(e) {
          var a, x = 0, y = 0;
          e = e || window.event;
          /* Get the x and y positions of the image: */
          a = img.getBoundingClientRect();
          /* Calculate the cursor's x and y coordinates, relative to the image: */
          x = e.pageX - a.left;
          y = e.pageY - a.top;
          /* Consider any page scrolling: */
          x = x - window.pageXOffset;
          y = y - window.pageYOffset;
          return {x : x, y : y};
        }
      } 

    async function getRandomLightShot(imageId = null) {
        if (loading) return; // return , don't ban me pls

        loading = true;

        if (!imageId) {
	        imageId = randomString(lightShotIdLength, '0123456789abcdefghijklmnopqrstuvwxyz');
    	}	

    	imageContainer.setAttribute("image-id",imageId); // just in case
        const url = proxyServer + lightShotUrl + imageId; // full request url

        statusText.textContent = "Loading ...";

        return new Promise((res,rej) => {
            $.ajax({
                url: url,
                method : 'GET',
                beforeSend : (xhr) => {
                    xhr.setRequestHeader("Access-Control-Allow-Origin","*"); // set cross origin header to request
                },
                success: (data) => {
                    let imgSrc = $(data).find("#screenshot-image").first().attr('src');
 
                    if (!imgSrc) {//jQuery went wrong ?
                        loading = false;
                        return rej("failed");
                    }

                    if (!imgSrc.includes('https')) { //not https means broken image
                        loading = false; 
                        return rej("broken image");
                    }

                    imageContainer.addEventListener('load',(l) => {
                        statusText.textContent = "Loaded";
                        imageZoom(imageContainer,zoomContainer);
                        imageContainer.removeEventListener("load",l);
                        loading = false;
                        return res(imgSrc);
                    });

                    imageContainer.setAttribute("src",imgSrc);
                    imageUrl.setAttribute("href",imgSrc);

                    const newLi = document.createElement("li"); // add to history ul
                    const newLink = document.createElement("a");
                    newLink.textContent = imageId;
                    newLink.setAttribute("href","#");
                    newLink.addEventListener("click",function() {    
                        this.parentNode.remove();
                        tryInfinite(getRandomLightShot,this.textContent);
                    });
                    newLi.append(newLink);
                    historyList.prepend(newLi);
                },
                error: (xhr, status ,err) => {
                    statusText.textContent = "An error happened , try to reload";
                    loading = false;
                    return rej(err);
                }
            });
        });
    }

    const sleep = (ms) => new Promise((res) => setTimeout(res,ms));

    const loopRandom = async (t) => {
        for (let index = 0; index < t; index++) {
            await sleep(1000);
            if (mode === "pause") { 
                progress.setAttribute("style",`width : 0%`);
                return;
            }
            progress.setAttribute("style",`width : ${(100 / t) * (index + 1)}%`);
        }

        getRandomLightShot()
            .then(() => {
                loopRandom(t);
            })
            .catch((e) => {
                loopRandom(t);
            });
    };

    const handlePauseResume = () => {
        if (mode === "pause") {
            autoModeButton.setAttribute("value","Stop ⏹️");
            mode = "play";
            statusText.textContent = "Play";
            loopRandom(timeout);
        }else{
            autoModeButton.setAttribute("value","Start ⏯️");
            mode = "pause";
            statusText.textContent = "Paused";
        }
    }

    document.addEventListener("keypress",(event) => {

        if (event.which === 97 && !loading) {
            event.preventDefault();
            tryInfinite(getRandomLightShot);
        }

        if (event.which === 32) {
            event.preventDefault();
            handlePauseResume();
        }   
    });

    autoModeButton.addEventListener("click",handlePauseResume);

    tryInfinite(getRandomLightShot);
});