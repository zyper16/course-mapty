import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'leaflet';

// fix display of markers when page loads -> get them from the markers array and not from the workouts array

// ('use strict');

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form__new__workout');
const containerWorkouts = document.querySelector('.workouts');
const errorMessage = document.querySelector('.error_message');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const inputTypeEdit = document.querySelector('.form__input--type--edit');
const inputDistanceEdit = document.querySelector('.form__input--distance--edit');
const inputDurationEdit = document.querySelector('.form__input--duration--edit');
const inputCadenceEdit = document.querySelector('.form__input--cadence--edit');
const inputElevationEdit = document.querySelector('.form__input--elevation--edit');
const inputHidden = document.querySelector('.form__input--id');
const btnSubmitForm = document.querySelector('.form__btn');
const btnDeleteAllWorkouts = document.querySelector('.delete-all-workouts');
const btnEditWorkout = document.querySelector('.workout__controls__edit');
// const myIcon = L.icon({ iconUrl: icon });

/////////////////////////////////////  DATA CLASES /////////////////////////////////////////////////////
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////// APPLICATION ////////////////////////////////////////////////
class App {
  #workouts = [];
  #workoutMarkers = [];
  #mapEvent;
  #map;
  #mapZoomLevel = 13;

  constructor() {
    this._getPosition(); // Get user position
    this._getLocalStorage(); // Get data from local storage
    // Event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));
    form.addEventListener('submit', this._submitEditedWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));
    btnDeleteAllWorkouts.addEventListener('click', this._deleteAllWorkouts.bind(this));
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._deleteWorkoutMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () {
        window.alert('Geolocation is not active for your browser! :-(');
      });
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    this.#map = L.map('map').setView([latitude, longitude], this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    this.#map.on('click', this._resetForm.bind(this));
    this.#map.on('click', this._showForm.bind(this));

    const data = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _showErrorMessage() {
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 3000);
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _resetForm() {
    inputHidden.value = inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    this._toggleElevationField();
    inputType.disabled = false;
  }

  _toggleElevationField() {
    // inputElevation.closest('.form__row ').classList.toggle('form__row--hidden');
    // inputCadence.closest('.form__row ').classList.toggle('form__row--hidden');
    if (inputType.value === 'running') {
      inputCadence.closest('.form__row ').classList.remove('form__row--hidden');
      inputElevation.closest('.form__row ').classList.add('form__row--hidden');
    }

    if (inputType.value === 'cycling') {
      inputCadence.closest('.form__row ').classList.add('form__row--hidden');
      inputElevation.closest('.form__row ').classList.remove('form__row--hidden');
    }
  }

  _validatePositive(...inputs) {
    return inputs.every(input => input > 0);
  }

  _validateNumbers(...inputs) {
    return inputs.every(input => isFinite(input));
  }

  _newWorkout(e) {
    if (inputHidden.value) return;
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const elevation = +inputElevation.value;
    const cadence = +inputCadence.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    e.preventDefault();
    // this._hideForm();
    if (type === 'running') {
      if (!this._validatePositive(distance, duration, cadence) || !this._validateNumbers(distance, duration, cadence))
        // return alert('Please introduce a positive number!');
        return this._showErrorMessage();

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    if (type === 'cycling') {
      if (!this._validatePositive(distance, duration, elevation) || !this._validateNumbers(distance, duration, elevation))
        // return alert('Please introduce a positive number!');
        return this._showErrorMessage();

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    this.#workouts.push(workout);
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

    this._hideForm();
    console.log('blablabla');
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    const newMarker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 30,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();
    workout.markerId = newMarker._leaflet_id;
    this.#workoutMarkers.push(newMarker);
    // workout.marker = newMarker;
    // console.log(workout.marker._leaflet_id);
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}" data-workout-id="${workout.markerId}">
    <div class="workout__header">
    <span class="workout__title">${workout.description}</span>
    <div class="workout__controls">
    <span class="workout__controls__edit">E</span>
      <span class="workout__controls__delete">X</span>
    </div>
    </div>
    <div class="workout__details">
      <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.type === 'running') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
    `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(event) {
    const workoutPos = event.target.closest('.workout');
    if (!workoutPos) return;
    const workout = this.#workouts.find(work => work.id === workoutPos.dataset.id);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
    // workout.click();
  }

  _printWorkoutList() {
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  _clearWorkoutList() {
    const workouts = document.querySelectorAll('.workout');
    workouts.forEach(workout => workout.remove());
  }

  _deleteWorkout() {
    if (event.target.classList.contains('workout__controls__delete')) {
      this.#workouts = this.#workouts.filter(workout => workout.id !== event.target.closest('.workout').dataset.id);
      event.target.closest('.workout').remove();
      this._setLocalStorage();
    }
  }

  _deleteAllWorkouts(event) {
    event.preventDefault();
    if (window.confirm('Are you sure you want to delete the workout?')) {
      this.#workouts = [];
      this._setLocalStorage();
      location.reload();
      // const workoutEntries = document.querySelectorAll('.workout');
      // workoutEntries.forEach(workout => workout.remove());
    }
  }

  _deleteWorkoutMarker() {
    if (event.target.classList.contains('workout__controls__delete')) {
      const editID = event.target.closest('.workout').dataset.workoutId;
      console.log(editID);
      const marker = this.#workoutMarkers.find(marker => marker._leaflet_id == editID);
      this.#workoutMarkers = this.#workoutMarkers.filter(marker => marker._leaflet_id != editID);
      console.log(marker);
      this.#map.removeLayer(marker);
    }
  }

  _editWorkout(event) {
    if (event.target.classList.contains('workout__controls__edit')) {
      event.preventDefault();
      const editID = event.target.closest('.workout').dataset.id;
      const workout = this.#workouts.find(workout => workout.id === editID);
      inputType.value = workout.type;
      this._resetForm();
      inputType.disabled = true;
      inputDistance.value = workout.distance;
      inputDuration.value = workout.duration;
      inputCadence.value = workout.cadence;
      inputElevation.value = workout.elevationGain;
      inputHidden.value = editID;
      if (workout.type === 'cycling') this._toggleElevationField();
      this._showForm();
    }
  }

  _submitEditedWorkout(event) {
    event.preventDefault();
    if (!inputHidden.value) return;
    const editID = inputHidden.value;
    const workoutIndex = this.#workouts.findIndex(workout => workout.id == editID);
    const workout = this.#workouts[workoutIndex];
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const elevation = +inputElevation.value;
    const cadence = +inputCadence.value;

    // console.log(workout.prototype);
    workout.distance = inputDistance.value;
    workout.duration = inputDuration.value;
    // workout.elevationGain = inputElevation.value;
    if (workout.type === 'running') {
      if (!this._validatePositive(distance, duration, cadence) || !this._validateNumbers(distance, duration, cadence))
        return this._showErrorMessage();
      workout.__proto__ = Running.prototype;
      workout.cadence = inputCadence.value;
      workout.pace = workout.calcPace();
    }

    if (workout.type === 'cycling') {
      if (!this._validatePositive(distance, duration, elevation) || !this._validateNumbers(distance, duration, elevation))
        return this._showErrorMessage();
      workout.__proto__ = Cycling.prototype;
      workout.elevationGain = inputElevation.value;
      workout.speed = workout.calcSpeed();
    }
    this._hideForm();
    this._setLocalStorage();
    this._clearWorkoutList();
    this._printWorkoutList();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    // localStorage.setItem('workoutMarkers', JSON.stringify(this.#workoutMarkers));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this._printWorkoutList();
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  showData() {
    const vector = this.#workouts;
    // console.log(vector);
    return vector;
  }
}

const app = new App();
