//UI
const locateMeBTN = document.getElementById('locate-btn');
const setMarkerBTN = document.getElementById('setmarker-btn');
const clearAllBTN = document.getElementById('clear-btn');
const hudCHK = document.getElementById('hud-check');
const cheatCHK = document.getElementById('cheat-check');
const hudDOM = document.querySelector('.hud');
//results UI
const distanceTitleDOM = document.querySelector('.distance');
const distanceResultDOM = document.querySelector('.distance .value');
const distanceUnitsDOM = document.querySelector('.distance .units');
const areaTitleDOM = document.querySelector('.area');
const areaResultDOM = document.querySelector('.area .value');
const areaUnitsDOM = document.querySelector('.area .units');
//dashboard UI
const hudLatitude = document.querySelector('.hud-lat .hud-text');
const hudLongitude = document.querySelector('.hud-lon .hud-text');
const hudAccuracy = document.querySelector('.hud-accuracy .hud-text');
const hudSpeed = document.querySelector('.hud-speed .hud-text');
const hudAltitude = document.querySelector('.hud-altitude .hud-text');
// map
const lightMapStyle = 'mapbox/light-v10';
const darkMapStyle = 'mapbox/dark-v10';
const apiTilesKey = 'api key here to test'
const  map = L.map('map',{ zoomControl: false, attributionControl: false});
L.control.attribution({position: 'topright'}).addTo(map);
const markersLayer = new L.LayerGroup();
const polylinesLayer = new L.LayerGroup();
const markers = [];
const zoomMin = 3;
let zoomActual =16;
const zoomMax = 18;
//mark icons
const xIcon = 52; //file res 100
const yIcon = 42; //file res 82
const xAnchorPop = 0;
const yAnchorPop = -15;
//vars
const bananaLong = 0.16; //meters
const bananaWeight = 7; //bananas -not used yet
let watchLocationEnable = true; //enables-disables continuos geolocation
let watchID;
let units = 'bananas'; //or metric
// let latestLat, latestLon;

const markerIcon = L.icon({
    iconUrl: '../images/banana-mark.png',
    iconSize: [xIcon, yIcon],
    iconAnchor: [xIcon/2, yIcon/2],
    popupAnchor: [xAnchorPop, yAnchorPop]
});
const markedIcon = L.icon({
    iconUrl: '../images/banana-marked.png',
    iconSize: [xIcon, yIcon],
    iconAnchor: [xIcon/2, yIcon/2],
    popupAnchor: [yAnchorPop, yAnchorPop]
});
//continuous location
let constantId;
//watch options
const watchOptions = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 15000
};
//popup
const mainPopUp = "<div class='popup'>I am a Banana and<br><strong>you are here</strong><div class='popup'>";


/*
* @description initialize map and map-functions
*/
function initMap() {
    map.fitWorld();

    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${apiTilesKey}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: zoomMax,
        minZoom: zoomMin,
        id: darkMapStyle,
        tileSize: 512,
        zoomOffset: -1,
        accessToken: apiTilesKey,
    }).addTo(map);

    markersLayer.addTo(map);

    const mainMarker = L.marker([0,0], {id: 'position', icon: markerIcon});
    mainMarker.bindPopup(mainPopUp);
    mainMarker.addTo(map);

    /*
    * @description Gets a marker by custom ID. Used to get the possition marker
    * @return {object} marker
    */
    L.Map.include({
        getMarkerById: function (id) {
            let marker = null;
            this.eachLayer(function (layer) {
                if (layer instanceof L.Marker) {
                    if (layer.options.id === id) {
                        marker = layer;
                    }
                }
            });
            return marker;
        }
    });

    map.on('zoomend', onZoomResizeIcon);

    /*
    * @description Resizes position Icon and all markers when zooming the map
    */
    function onZoomResizeIcon(e){
        zoomActual = e.target._zoom;
        const scaleVal = zoomActual / zoomMax;
        const xNew = xIcon * scaleVal;
        const yNew = yIcon * scaleVal;

        const actualPosMarker = map.getMarkerById('position');
        //there is a position marker so zoom it
        if(actualPosMarker){
            const accuracy = actualPosMarker.options.accuracy;

            const newIconMark = L.icon({
                iconUrl: iconSelector(accuracy)[0],
                iconSize: [xNew, yNew],
                iconAnchor: [xNew/2, yNew/2],
                popupAnchor: [xAnchorPop, yAnchorPop]
            });

            const latLng = actualPosMarker.getLatLng();
            map.removeLayer(actualPosMarker);
            const newActualPosMarker = L.marker(latLng, {id: 'position', icon: newIconMark});
            newActualPosMarker.bindPopup(mainPopUp);
            newActualPosMarker.addTo(map);
        }

        //TODO: resize markers
        if (markers.length > 0) {
            markersLayer.clearLayers();

            const newIconMarked = L.icon({
                iconUrl: '../images/banana-marked.png',
                iconSize: [xNew, yNew],
                iconAnchor: [xNew/2, yNew/2],
                popupAnchor: [-3, -76]
            });

            for (marker of markers) {
                const latLng = marker._latlng;
                const accuracy = marker.options.accuracy;
                newIconMarked.options.iconUrl = iconSelector(accuracy)[1];
                const newMarker = L.marker(latLng, {timestamp: 123, icon: newIconMarked});
                markersLayer.addLayer(newMarker);
            }
        }
    }

    startLocation();

}


/*
* @description start geolocation
*/
function startLocation() {
    try {
        if (navigator.geolocation) {
            //get location
            navigator.geolocation.getCurrentPosition(locationSuccess, locationError, watchOptions);
            watchID = navigator.geolocation.watchPosition(locationSuccess, locationError, watchOptions);
        }else{
            alert("Browser don't support geolocalization");
        }
    }
    catch(error){
        alert("Couldn't initialize geolocation. Please check connection.");
        console.log("error", error);
    }
}


/*
* @description stop geolocation watchPosition
*/
function stopLocation() {
    navigator.geolocation.clearWatch(watchID);
}


/*
* @description handle location position callback
*/
function locationSuccess(positionData) {
    const latitude = positionData.coords.latitude;
    const longitude = positionData.coords.longitude;
    const timestamp = positionData.timestamp; 
    let accuracy, speed, altitude;
    if (units === 'bananas') {
        if(positionData.coords.speed !== null) {
            speed = ((positionData.coords.speed * 3.6) / bananaLong).toFixed(2) + ' b/h';
        }else{
             speed = 'N/A';
        };

        if(positionData.coords.accuracy) {
            accuracy = (positionData.coords.accuracy / bananaLong).toFixed(2) + ' bns';
        }else{
             accuracy = 'N/A';
        };

        if(positionData.coords.altitude){
            altitude = (positionData.coords.altitude / bananaLong).toFixed(2) + ' bns';
        }else{
             altitude = 'N/A';
        };

    } else {

        if(positionData.coords.speed) {
            speed = (positionData.coords.speed * 3.6).toFixed(2) + ' k/h';
        }else{
             speed = 'N/A';
        }

        if(positionData.coords.accuracy) {
            accuracy = positionData.coords.accuracy.toFixed(2) + ' mts';
        }else{
             accuracy = 'N/A';
        };

        if(positionData.coords.altitude) {
            altitude = positionData.coords.altitude.toFixed(2) + ' mts';
        }else{
             altitude = 'N/A';
        };
    }

    hudLatitude.textContent = latitude;
    hudLongitude.textContent = longitude;
    hudAccuracy.textContent = accuracy;
    hudSpeed.textContent = speed;
    hudAltitude.textContent = altitude;

    markerIcon.options.iconUrl = iconSelector(positionData.coords.accuracy)[0];

    //add actual position indicator
    const actualPosMarker = map.getMarkerById('position');

    if (actualPosMarker) map.removeLayer(actualPosMarker);

    const mainMarker = L.marker([latitude,longitude], {id: 'position', icon: markerIcon, altitude: positionData.coords.altitude, speed:positionData.coords.speed, accuracy:positionData.coords.accuracy});
    mainMarker.options.timestamp = timestamp;
    mainMarker.options.accuracy = positionData.coords.accuracy;
    mainMarker.bindPopup(mainPopUp);
    mainMarker.addTo(map);

    //set de map view of the actual position
    map.setView([latitude, longitude], zoomActual);
}


/*
* @description handle location error callback
*/
function locationError(error) {
    let msg;
    switch(error.code){
        case 1:
            //error PERMISSION DENIED
            msg = 'please enable geolocation while using this App.';
            break;
            
        case 2:
            //error POSITION UNAVAILABLE
            msg = 'there was a problem locating thisdevice. Please check connection.';
            break;
            
        case 3:
            //TIMEOUT
            msg = "a lot of time has passed whith out locating the device.";
            break;
    }
    alert(`Oops... ${msg}`);
}


//page loaded initialize map
window.addEventListener('load', ()=>{
    initMap();
})


/*
* @description enable or pause continuos geolocation
*/
locateMeBTN.addEventListener('click', (e) => {
    e.preventDefault();
    watchLocationEnable =! watchLocationEnable ;
    if (watchLocationEnable) {
        locateMeBTN.textContent = "pause";
        startLocation();
    } else {
        locateMeBTN.textContent = "start";
        stopLocation();
    }
});


/*
* @description set a new marker on the map
*/
setMarkerBTN.addEventListener('click', (e) => {
    e.preventDefault();
    const actualPosMarker = map.getMarkerById('position');
    
    if(actualPosMarker){
        const latLng = actualPosMarker.getLatLng();
        const accuracy = actualPosMarker.options.accuracy;
        const timestamp = actualPosMarker.options.timestamp;
        
        markedIcon.options.iconUrl = iconSelector(accuracy)[1];
        
        let distance = 0;
        if(markers.length > 0) {
            const idx = markers.length -1;
            const prevMarker = markers[idx];
            const prevLatLng = prevMarker._latlng;
            distance = prevLatLng.distanceTo(latLng);
        }
        
        const newMarker = L.marker(latLng, {timestamp: timestamp, accuracy:accuracy, distance: distance, icon: markedIcon})
        markers.push(newMarker);
        //add to map layer
        newMarker.setZIndexOffset(-1000); //bring to front workaround
        
        //creating popup
        let popMarker = `<div class="popUp"><h3>Marker ${markers.length}</h3>`;

        if(markers.length > 1) {
            const distanceMeters = distance.toFixed(2);
            const distanceBananas = (distanceMeters / bananaLong).toFixed(2);
            popMarker = popMarker + `<p><strong>Previous Marker at</strong></p>
            <p>${distanceBananas} bananas</p>
            <p>${distanceMeters} meters</p></div>`;
        } else {
            popMarker = popMarker + '<p>I am the first Marker</p></div>';
        }
        
        newMarker.bindPopup(popMarker).open;
        
        markersLayer.addLayer(newMarker);
        
        if(map.hasLayer(actualPosMarker)) { map.removeLayer(actualPosMarker)};
        
    } else {
        //no position marker - handle double tap?
        alert('Please wait to the device getting located before adding a marker.');
    }
    
    // two points at least needed to draw a line
    if (markers.length > 1) drawLines();
});


/*
* @description clear all markers and lines
*/
clearAllBTN.addEventListener('click', () => {
    markersLayer.clearLayers();
    polylinesLayer.removeFrom(map);
    markers.length = 0;
    //clear UI result area
    distanceTitleDOM.textContent = 'Walk around and drop a few bananas';
    distanceResultDOM.textContent = '';
    distanceUnitsDOM.textContent = '';
    areaTitleDOM.textContent = '';
    areaResultDOM.textContent = '';
    areaUnitsDOM.textContent = '';
});


/*
* @description show or hide HUD
*/
hudCHK.addEventListener('click', () => {
    hudDOM.classList.toggle('hide');
});

cheatCHK.addEventListener('click', () => {
    (cheatCHK.checked) ? units = 'metric' : units = 'bananas';
    updateHUD();
});


/*
* @description change units in wich data is shown on the HUD
*/
function updateHUD() {
    //get the latest data available (position or last marker)
    let actualMarker;
    if (map.getMarkerById('position')){
        actualMarker = map.getMarkerById('position');
    } else {
        const idx = markers.length-1;
        actualMarker = markers[idx];
    };
    const accuracy = actualMarker.options.accuracy;
    const speed = actualMarker.options.speed * 3.6;
    const altitude = actualMarker.options.altitude;
    
    if (units === 'bananas') {
        if (markers.length > 1) {
            distanceResultDOM.textContent = (distanceResultDOM.textContent / bananaLong).toFixed(2);
            distanceUnitsDOM.textContent = " bananas"
        };
        
        if (typeof(accuracy)==='number') {
            hudAccuracy.textContent = `${(accuracy / bananaLong).toFixed(2)} bns`;
        } else {
            hudAccuracy.textContent = 'N/A';
        }
        
        if (typeof(speed)==='number' && speed > 0) {
            hudSpeed.textContent = `${(accuracy / bananaLong).toFixed(2)} b/h`;
        } else {
            hudSpeed.textContent = 'N/A';
        }
        
        if (typeof(altitude)==='number') {
            hudAltitude.textContent = `${(altitude / bananaLong).toFixed(2)} bns`;
        } else {
            hudAltitude.textContent = 'N/A';
        }
        
    } else {
        if (markers.length > 1) {
            distanceResultDOM.textContent = (distanceResultDOM.textContent * bananaLong).toFixed(2);
            distanceUnitsDOM.textContent = " meters"
        };
        
        if (typeof(accuracy)==='number') {
            hudAccuracy.textContent = `${accuracy.toFixed(2)} mts`;
        } else {
            hudAccuracy.textContent = 'N/A';
        }
        
        if (typeof(speed)==='number' && speed > 0) {
            hudSpeed.textContent = `${accuracy.toFixed(2)} k/h`;
        } else {
            hudSpeed.textContent = 'N/A';
        }
        
        if (typeof(altitude)==='number') {
            hudAltitude.textContent = `${altitude.toFixed(2)} mts`;
        } else {
            hudAltitude.textContent = 'N/A';
        }
    }
}


/*
* @description draw a line between markers
*/
function drawLines() {
    polylinesLayer.clearLayers();
    const points = [];
    let totalDistance = 0;
    for (marker in markers) {
        const latling = markers[marker].getLatLng();
        const point = [latling.lat, latling.lng];
        totalDistance = totalDistance + markers[marker].options.distance;
        points.push(point);
    }
    
    const polyline = L.polyline(points, {color: 'yellow', fill:false, fillColor: 'yellow', fillOpacity: '0.2', className: 'poly-fill'});
    polylinesLayer.addLayer(polyline);
    polylinesLayer.addTo(map);

    //update UI result area text
    updateDistanceUI(totalDistance);
}


//UTILITIES
/*
* @description Select icon image
* @param {number} accuracy of location
* @return {array string} relative path to position icon image, relative path to marked icon image
*/
function iconSelector(accuracy) {
    const icons = [];
    if (accuracy < 3) {
        icons.push('../images/banana-mark-green.png');
        icons.push('../images/banana-marked-green.png');
    } else if (accuracy <= 10){
        icons.push('../images/banana-mark.png');
        icons.push('../images/banana-marked.png');
    } else {
        icons.push('../images/banana-mark-red.png');
        icons.push('../images/banana-marked-red.png');
    }
    return icons
}


/*
* @description update UI distance result
* @param {number} distance in meters
*/
function updateDistanceUI(distance) {
    distanceTitleDOM.textContent = 'Distance ';
    (units === 'bananas') ? distanceResultDOM.textContent = (distance / bananaLong).toFixed(2) : distanceResultDOM.textContent = distance.toFixed(2);
    (units === 'bananas')? distanceUnitsDOM.textContent = ' bananas' : distanceUnitsDOM.textContent = ' meters';
    distanceTitleDOM.appendChild(distanceResultDOM);
    distanceTitleDOM.appendChild(distanceUnitsDOM);
    if (markers.length > 2) {
        // TODO: Add Area Calculation
        // areaTitleDOM.textContent = 'Area';
        // areaResultDOM.textContent = '';
        // areaUnitsDOM.textContent = '';
    } else {
        areaTitleDOM.textContent = '';
        areaResultDOM.textContent = '';
        areaUnitsDOM.textContent = '';
    }
}