// Attributed to Claude AI Prompted by Oliver

$(document).ready(function () {
  // State management
  let personalInfo = {
    gender: "",
    weight: 0,
  };
  let drinkGroups = {};
  let updateInterval;
  let lastUpdateTime = null; // Added this important variable
  let targetEndTime = null; // Added to track when BAC will reach 0

  // Constants
  const METABOLISM_RATE = 0.015; // BAC reduction per hour
  const ALCOHOL_DENSITY = 0.789; // g/ml
  const ML_PER_OZ = 29.5735;
  const GENDER_CONSTANTS = {
    male: 0.68,
    female: 0.55,
  };

  // Event Handlers
  $("#saveInfo").click(function () {
    const gender = $("#gender").val();
    const weight = parseFloat($("#weight").val());

    if (!gender || !weight) {
      $("#personalInfoError").show();
      return;
    }

    personalInfo.gender = gender;
    personalInfo.weight = weight;
    $("#personalInfoError").hide();
    alert("Personal information saved!");
  });

  $("#addDrink").click(function () {
    if (!personalInfo.gender || !personalInfo.weight) {
      alert("Please save personal information first!");
      return;
    }

    const name = $("#drinkName").val();
    const abv = parseFloat($("#abv").val());
    const oz = parseFloat($("#oz").val());

    if (!name || !abv || !oz) {
      $("#drinkError").show();
      return;
    }

    addDrinkToGroup({
      name: name,
      abv: abv,
      oz: oz,
    });

    // Clear inputs
    $("#drinkName").val("");
    $("#abv").val("");
    $("#oz").val("");
    $("#drinkError").hide();
  });

  // Drink Management Functions
  function createDrinkKey(drink) {
    return `${drink.name}-${drink.abv}-${drink.oz}`;
  }

  function addDrinkToGroup(drink) {
    const drinkKey = createDrinkKey(drink);

    if (!drinkGroups[drinkKey]) {
      drinkGroups[drinkKey] = {
        name: drink.name,
        abv: drink.abv,
        oz: drink.oz,
        timestamps: [],
        count: 0,
      };
    }

    drinkGroups[drinkKey].timestamps.push(new Date());
    drinkGroups[drinkKey].count++;

    updateDrinksList();
    startActiveUpdates();
  }

  function updateDrinksList() {
    const drinksList = $("#drinksList");
    drinksList.empty();

    Object.keys(drinkGroups).forEach((key) => {
      const group = drinkGroups[key];
      const timestamps = group.timestamps
        .map((t) => t.toLocaleTimeString())
        .join(", ");

      const drinkGroup = $(`
                <div class="drink-group">
                    <div class="drink-info">
                        <strong>${group.name}</strong> - ${group.abv}% ABV, ${group.oz}oz
                        <div class="drink-timestamps">
                            Times added: ${timestamps}
                        </div>
                    </div>
                    <div class="drink-controls">
                        <span class="drink-count">×${group.count}</span>
                        <button class="up-arrow" data-key="${key}">↑</button>
                    </div>
                </div>
            `);

      drinksList.append(drinkGroup);
    });

    // Add click handlers for up arrows
    $(".up-arrow").click(function () {
      const key = $(this).data("key");
      const group = drinkGroups[key];
      addDrinkToGroup({
        name: group.name,
        abv: group.abv,
        oz: group.oz,
      });
    });
  }

  // BAC Calculation Functions
  function calculateAlcoholGrams(drink) {
    return ((drink.oz * drink.abv) / 100) * ML_PER_OZ * ALCOHOL_DENSITY;
  }

  function calculateBAC() {
    if (Object.keys(drinkGroups).length === 0) return 0;

    let totalAlcohol = 0;
    const currentTime = new Date();
    const genderConstant = GENDER_CONSTANTS[personalInfo.gender];

    Object.values(drinkGroups).forEach((group) => {
      group.timestamps.forEach((timestamp) => {
        const alcoholGrams = calculateAlcoholGrams(group);
        const hoursElapsed = (currentTime - timestamp) / (1000 * 60 * 60);
        const remainingAlcohol = Math.max(
          0,
          alcoholGrams - METABOLISM_RATE * hoursElapsed
        );
        totalAlcohol += remainingAlcohol;
      });
    });

    const bac =
      (totalAlcohol * 100) / (personalInfo.weight * 453.592 * genderConstant);
    return Math.max(0, bac);
  }

  // Timer Functions
  function formatTime(hours) {
    const wholehours = Math.floor(hours);
    const minutes = Math.floor((hours - wholehours) * 60);
    const seconds = Math.floor(((hours - wholehours) * 60 - minutes) * 60);

    return `${wholehours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  function calculateTimeRemaining() {
    if (!targetEndTime) return 0;

    const now = new Date();
    const millisecondsRemaining = targetEndTime - now;
    return Math.max(0, millisecondsRemaining / (1000 * 60 * 60)); // Convert to hours
  }

  // mandy's code below
  $("#good").hide();
  $("#bad").hide();
  $("#dead").hide();
  $("#poison").hide();
  function updateBAcAndTimer() {
    const currentBAC = calculateBAC();
    $("#currentBAC").text(currentBAC.toFixed(3));

    if (currentBAC <= 0) {
      $("#timeRemaining").text("0:00:00");
      stopActiveUpdates();
    } else if (currentBAC < 0.08) {
      $("#message").text("get this guy behind the wheel!");
      $("#good").show();
      $("#bad").hide();
      $("#dead").hide();
      $("#poison").hide();
    } else if (currentBAC < 0.25) {
      $("#message").text("do NOT get this guy behind the wheel!");
      $("#bad").show();
      $("#good").hide();
      $("#dead").hide();
      $("#poison").hide();
    }
      else if (currentBAC < 0.40) {
        $("#message").text("you are poisoned")
        $("#bad").hide();
        $("#good").hide();
        $("#dead").hide();
        $("#poison").show();
      }
      else if (currentBAC > 0.40) {
        $("#message").text("you died")
        $("#dead").show();
        $("#bad").hide();
        $("#good").hide();
        $("#poison").hide();
      }

    // mandy's code end

    // Update target end time if it's not set
    if (!targetEndTime) {
      const hoursToZero = currentBAC / METABOLISM_RATE;
      targetEndTime = new Date(Date.now() + hoursToZero * 60 * 60 * 1000);
    }

    // Calculate and display remaining time
    const hoursRemaining = calculateTimeRemaining();
    $("#timeRemaining").text(formatTime(hoursRemaining));

    // If time has run out, stop updates
    if (hoursRemaining <= 0) {
      $("#timeRemaining").text("0:00:00");
      stopActiveUpdates();
    }
  }

  function startActiveUpdates() {
    // Clear existing intervals
    stopActiveUpdates();

    // Calculate initial BAC and set target end time
    const currentBAC = calculateBAC();
    if (currentBAC > 0) {
      const hoursToZero = currentBAC / METABOLISM_RATE;
      targetEndTime = new Date(Date.now() + hoursToZero * 60 * 60 * 1000);
    }

    // Start new interval for updates
    updateInterval = setInterval(updateBAcAndTimer, 1000);

    // Initial update
    updateBAcAndTimer();

    console.log("Timer started, updating every second");
  }

  function stopActiveUpdates() {
    if (updateInterval) {
      clearInterval(updateInterval);
      updateInterval = null;
      targetEndTime = null;
      console.log("Timer stopped");
    }
  }

  function resetTimer() {
    stopActiveUpdates();
    drinkGroups = {};
    targetEndTime = null;
    updateDrinksList();
    $("#currentBAC").text("0.000");
    $("#timeRemaining").text("0:00:00");
  }

  // Modified addDrinkToGroup to update end time
  function addDrinkToGroup(drink) {
    const drinkKey = createDrinkKey(drink);

    if (!drinkGroups[drinkKey]) {
      drinkGroups[drinkKey] = {
        name: drink.name,
        abv: drink.abv,
        oz: drink.oz,
        timestamps: [],
        count: 0,
      };
    }

    drinkGroups[drinkKey].timestamps.push(new Date());
    drinkGroups[drinkKey].count++;

    updateDrinksList();

    // Recalculate target end time and start timer
    const currentBAC = calculateBAC();
    const hoursToZero = currentBAC / METABOLISM_RATE;
    targetEndTime = new Date(Date.now() + hoursToZero * 60 * 60 * 1000);
    startActiveUpdates();
  }

  // Add button handlers
  $("#resetTimer").click(resetTimer);
});

// Trevor's Code Below
// Accessbility Menu JS
document.addEventListener("DOMContentLoaded", () => {
  const accessibilityButton = document.getElementById("accessibility-button");
  const accessibilityMenu = document.getElementById("accessibility-menu");
  const closeMenuButton = document.getElementById("close-menu-button");

  // Open the menu
  accessibilityButton.addEventListener("click", () => {
    accessibilityMenu.classList.add("visible");
    accessibilityButton.classList.add("hidden"); // Hide the button
  });

  // Close the menu
  closeMenuButton.addEventListener("click", () => {
    accessibilityMenu.classList.remove("visible");
    accessibilityButton.classList.remove("hidden"); // Show the button again
  });
});

// Contrast Button
const contrastButton = document.getElementById("contrast-toggle");

contrastButton.addEventListener("click", () => {
  let currentState = parseInt(contrastButton.getAttribute("data-state")); // Get current state
  currentState = (currentState + 1) % 4; // Cycle through 4 states
  contrastButton.setAttribute("data-state", currentState); // Update the state

  // Remove all state classes from the body
  document.body.classList.remove("inverted", "dark-contrast", "light-contrast");

  // Apply the appropriate class and update the button text
  if (currentState === 0) {
    contrastButton.textContent = "Contrast";
  } else if (currentState === 1) {
    document.body.classList.add("inverted");
    contrastButton.textContent = "Invert Colors";
  } else if (currentState === 2) {
    document.body.classList.add("dark-contrast");
    contrastButton.textContent = "Dark Contrast";
  } else if (currentState === 3) {
    document.body.classList.add("light-contrast");
    contrastButton.textContent = "Light Contrast";
  }
});

// Trevor's code end

//Jackson's code with the help of chat gpt to create a random drink generator
document.getElementById('cocktail-button').addEventListener('click', function() {
  fetch('https://www.thecocktaildb.com/api/json/v1/1/random.php')
      .then(response => response.json())
      .then(data => {
          const cocktail = data.drinks[0];

          // Display cocktail name
          document.getElementById('cocktail-name').textContent = cocktail.strDrink;

          // Display cocktail image
          document.getElementById('cocktail-image').src = cocktail.strDrinkThumb;

          // Display ingredients
          let ingredientsText = '';
          for (let i = 1; i <= 15; i++) {
              const ingredient = cocktail[`strIngredient${i}`];
              const measure = cocktail[`strMeasure${i}`];
              if (ingredient) {
                  ingredientsText += `${measure ? measure : ''} ${ingredient}<br>`;
              }
          }
          document.getElementById('cocktail-ingredients').innerHTML = ingredientsText;

          // Display instructions
          document.getElementById('cocktail-instructions').textContent = cocktail.strInstructions;
      })
      .catch(error => {
          console.error('Error fetching data: ', error);
      });
});