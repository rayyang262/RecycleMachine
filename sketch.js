const replicateProxy = "https://itp-ima-replicate-proxy.web.app/api";
let feedback;
let img;
let canvas;
let result;
let speaker;
let video;
let startMenuVideo;
let loadingVideo;
let recyclableVideo;
let nonRecyclableVideo;
let leftArrowVideo;
let rightArrowVideo;
let personDetected = false;
let isPlaying = false;
let lastPersonDetected = personDetected;
let correctSoundEffect;
let wrongSoundEffect;
let poseNet;
let poses = [];
let loadingSound;


function preload(){
  bodyPose = ml5.bodyPose();
  startMenuVideo = createVideo("Comp 1.mp4");
  loadingVideo = createVideo("Loading.mp4");
  recyclableVideo  = createVideo("Recyclable.mp4");
  nonRecyclableVideo = createVideo("Non Recyclable.mp4");
  leftArrowVideo = createVideo("Left arrow.mp4");
  rightArrowVideo = createVideo("Right arrow.mp4");
  correctSoundEffect = loadSound('Correct.mp3');
  wrongSoundEffect = loadSound('Wrong.mp3');
  loadingSound = loadSound('LoadingSound.mp3');

  startMenuVideo.hide();
  loadingVideo.hide();
  recyclableVideo.hide();
  nonRecyclableVideo.hide();
  leftArrowVideo.hide();
  rightArrowVideo.hide();
  leftArrowVideo.onended(restart);
  rightArrowVideo.onended(restart); 
  recyclableVideo.onended(function(){
    img = leftArrowVideo;
    leftArrowVideo.play()});
  nonRecyclableVideo.onended(function(){
    img = rightArrowVideo;
    rightArrowVideo.play()});
}


function setup() {
  
  speaker = new p5.Speech(); // speech synthesis object
  canvas = createCanvas(windowWidth, windowHeight);
  let input_image_field = createInput("Is this recyclable? Follow New York recycling rules. Use one sentence.");
  input_image_field.size(450);
  input_image_field.id("input_image_prompt");
  input_image_field.position(10, 10);
  input_image_field.hide();
  //add a button to ask for picture
  feedback = createP("");
  feedback.position(0, 20);

  video = createCapture(VIDEO);
  //video = createCapture({
    //video: {
      //facingMode: "user" // Use "environment" for rear camera
    //}
  //});

  vbutton = createButton();
  vbutton.hide();
  vbutton.mousePressed(function () {
    img = video;
  });
  vbutton.position(530, 10);
  video.size(windowWidth, windowHeight);
  video.hide();
  img = video;

  bodyPose.detectStart(video, gotPoses);

  textSize(15); 
  textAlign(CENTER, 225); 
  fill(0);
}

function draw() {
  console.log(video);
  if (lastPersonDetected != personDetected && personDetected == true){
    setTimeout(function(){
      askForPicture("Is this recyclable? Follow New York recycling rules. Be concise.");
      loadingVideo.loop();
      
      img = loadingVideo;
      loadingSound.loop();

    }, 5000)
  }
  lastPersonDetected = personDetected;
  if (personDetected == false){
    if (poses.length > 0) {
      // Extract leftEye and rightEye positions
      let leftEye = poses[0].left_eye;
      let rightEye = poses[0].right_eye;
  
      if (leftEye && rightEye) {
        let eyeDistance = dist(leftEye.x, leftEye.y, rightEye.x, rightEye.y);
      console.log(eyeDistance);
        // Check if distance is above threshold
        if (eyeDistance > 90) { // Adjust threshold as needed
          personDetected = true;
        } else {
          personDetected = false;
        }
      } else {
        personDetected = false;
      }
    } else {
      personDetected = false;
    }
    image(startMenuVideo, 0, 0, width, height);
    text("Please put your face near the camera", width / 2, height-30); 

  } else if (personDetected == true){
    if (img) image(img, 0, 0, width, height);
  }
  
}

async function askForPicture(p_prompt) {
  //pull the image off the canvas
  canvas.loadPixels();
  let imgBase64 = canvas.elt.toDataURL();
  console.log(canvas.elt)
  let data = {
    version: "80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb",
    input: {
      prompt: p_prompt,
      negative_prompt: "",
      prompt_strength: 0.5,
      num_inference_steps: 50,
      width: 1024,
      height: 1024,
      guidance_scale: 7.5,
      seed: 42,
      image: imgBase64,
    },
  };
  console.log("Asking for Picture Info From Replicate via Proxy", data);
  let options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };
  const url = replicateProxy + "/create_n_get/";
  const picture_info = await fetch(url, options);
  //turn the stuff coming back into json
  const proxy_said = await picture_info.json();
  console.log("json:", proxy_said);
  if (proxy_said.output.length == 0) {
    feedback.html("Something went wrong, try it again");
    return;
  }
  const sentence = proxy_said.output.join(" ");
  const splitSentence = sentence.split(".");
  //feedback.html(sentence);
  speaker.speak(splitSentence);
  if (
    sentence.toLowerCase().includes("not recyclable") ||
    sentence.toLowerCase().includes("no")
  ) {
    result = "no";
    img = nonRecyclableVideo;
    loadingSound.stop();
    wrongSoundEffect.play();
    nonRecyclableVideo.play();

  } else if (
    sentence.toLowerCase().includes("recyclable") ||
    sentence.toLowerCase().includes("yes")
  ) {
    result = "yes";
    img = recyclableVideo;
    loadingSound.stop();
    correctSoundEffect.play();
    recyclableVideo.play();
  } else {
    feedback.html(
      "The model couldn't determine if it's recyclable. Try again."
    );
  }
}
function keyPressed(){
  if(key == "a"){
    personDetected = false;
  }
}
function mousePressed(){
  if (isPlaying == false){
    startMenuVideo.loop();
    isPlaying = true;
  }
}
function restart(){
  personDetected = false;
  img = video;

}
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
}