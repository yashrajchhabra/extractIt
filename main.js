const frames = {};

function extract() {
    const urls = document.getElementById('input').value.split(',');
    console.time("completion");
    asyncFor(urls.length, function (loop) {
        document.getElementById('status').innerText = 'Getting video';
        getVideo(urls[loop.iteration()]).then(urlObject => {
            document.getElementById('status').innerText = 'Extracting Frames';
            extractFrames(0, urlObject, 0, document.getElementById('sample-rate').value, function () {
                loop.next();
            })
        });
    }, function () {
        document.getElementById('status').innerText = 'Extraction Complete';
        console.timeEnd("completion");
    });
}

function getVideo(url) {
    return fetch(url)
        .then(res => res.blob())
        .then(blob => URL.createObjectURL(blob));
}

function extractFrames(startTime, urlObject, i, sampleRate, callback) {
    const endTime = 300;
    const video = document.createElement('video');
    const array = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let pro;
    if (i === 0) {
        pro = document.querySelector('#progress-' + i);
    }
    console.time("extraction" + startTime);

    function end() {
        frames[startTime] = array;
        console.timeEnd("extraction" + startTime);
        renderImages();
        callback();
    }

    function revokeURL(e) {
        URL.revokeObjectURL(this.src);
    }

    function renderImages() {
        let count = 0;
        const framesDiv = document.getElementById('frames');
        for (let key in frames) {
            let img;
            count += frames[key].length;
            for (let j = 0; j < frames[key].length; j++) {
                img = new Image();
                img.onload = revokeURL;
                img.src = frames[key][j];
                img.width = 1280;
                img.height = 720;
                framesDiv.appendChild(img);
            }
            URL.revokeObjectURL(this.src);
        }
        document.getElementById('frames-generated').innerText = count + ' frames generated';
    }

    video.muted = true;
    video.currentTime = startTime;

    function getCanvasBlob(self, canvas) {
        return new Promise(function (resolve, reject) {
            ctx.drawImage(self, 0, 0);
            canvas.toBlob(function (blob) {
                array.push(URL.createObjectURL(blob));
                resolve();
            }, 'image/jpeg')
        })
    }

    video.addEventListener('loadedmetadata', function () {
        canvas.width = this.videoWidth;
        canvas.height = this.videoHeight;
    }, false);

    video.addEventListener('canplaythrough', function (e) {
        getCanvasBlob(this, canvas).then(function () {
            if (pro) {
                pro.innerHTML = ((video.currentTime / video.duration) * 100).toFixed(2) + ' %';
            }
            if (video.currentTime < endTime - 1) {
                video.currentTime += parseInt(sampleRate);
            } else {
                end();
            }
        });
    }, false);

    video.src = urlObject;
}

function asyncFor(iterations, func, callback) {
    let index = 0;
    let done = false;
    const loop = {
        next: function () {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function () {
            return index - 1;
        },

        break: function () {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}
