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
  function updateBAcAndTimer() {
    const currentBAC = calculateBAC();
    $("#currentBAC").text(currentBAC.toFixed(3));

    if (currentBAC <= 0) {
      $("#timeRemaining").text("0:00:00");
      stopActiveUpdates();
      return;
    }
    if (currentBAC < 0.08) {
      $("#message").text("get this guy behind the wheel!");
      $("#good").show();
      $("#bad").hide();
      return;
    }
    if (currentBAC >= 0.08) {
      $("#message").text("do NOT get this guy behind the wheel!");
      $("#bad").show();
      $("#good").hide();
      return;
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
// Thanks with the help of ChatGPT
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
    setTimeout(() => {
      accessibilityButton.classList.remove("hidden"); // Show the button after the fade-out
    }, 200); // Delay matches the CSS transition duration (0.3s)
  });
});

// Contrast Button
document.addEventListener("DOMContentLoaded", () => {
  const contrastButton = document.getElementById("contrast-toggle");

  contrastButton.addEventListener("click", () => {
    let currentState = parseInt(contrastButton.getAttribute("data-state")); // Get current state
    currentState = (currentState + 1) % 3; // Cycle through 3 states
    contrastButton.setAttribute("data-state", currentState); // Update the state

    // Remove all state classes from the body
    document.body.classList.remove("dark-contrast", "light-contrast");

    // Apply the appropriate class and update the button text
    if (currentState === 0) {
      contrastButton.textContent = "Contrast";
    } else if (currentState === 1) {
      document.body.classList.add("dark-contrast");
      contrastButton.textContent = "Dark Contrast";
    } else if (currentState === 2) {
      document.body.classList.add("light-contrast");
      contrastButton.textContent = "Light Contrast";
    }
  });
});

// Font Size Button
document.addEventListener("DOMContentLoaded", () => {
  const fontSizeButton = document.getElementById("font-size-toggle");
  const root = document.documentElement; // Reference to <html>

  fontSizeButton.addEventListener("click", () => {
    // Get the current state
    let currentState = parseInt(fontSizeButton.getAttribute("data-state")) || 0;

    // Update the state and cycle through 4 font size states
    currentState = (currentState + 1) % 4;
    fontSizeButton.setAttribute("data-state", currentState);

    // Apply the font size based on the state
    if (currentState === 0) {
      root.style.fontSize = "16px"; // Default size
      fontSizeButton.textContent = "Font Size";
    } else if (currentState === 1) {
      root.style.fontSize = "18px"; // Slightly larger
      fontSizeButton.textContent = "Large";
    } else if (currentState === 2) {
      root.style.fontSize = "20px"; // Even larger
      fontSizeButton.textContent = "Larger";
    } else if (currentState === 3) {
      root.style.fontSize = "14px"; // Smaller size
      fontSizeButton.textContent = "Small";
    }
  });
});

// Line Spacing Button
document.addEventListener("DOMContentLoaded", () => {
  const textSpacingButton = document.getElementById("text-spacing-toggle");

  textSpacingButton.addEventListener("click", () => {
    let currentState = parseInt(textSpacingButton.getAttribute("data-state")); // Get current state
    currentState = (currentState + 1) % 4; // Cycle through 4 states
    textSpacingButton.setAttribute("data-state", currentState); // Update the state

    // Remove all line-spacing classes
    document.body.classList.remove(
      "text-spacing-0",
      "text-spacing-1",
      "text-spacing-2",
      "text-spacing-3"
    );

    // Apply the appropriate text-spacing class based on the current state
    if (currentState === 0) {
      document.body.classList.add("text-spacing-0");
      textSpacingButton.textContent = "Text Spacing";
    } else if (currentState === 1) {
      document.body.classList.add("text-spacing-1");
      textSpacingButton.textContent = "Light Spacing";
    } else if (currentState === 2) {
      document.body.classList.add("text-spacing-2");
      textSpacingButton.textContent = "Moderate Spacing";
    } else if (currentState === 3) {
      document.body.classList.add("text-spacing-3");
      textSpacingButton.textContent = "Heavy Spacing";
    }
  });
});

// Line Height Button
document.addEventListener("DOMContentLoaded", () => {
  const lineHeightButton = document.getElementById("line-height-toggle");

  // Add event listener to change line-height when button is clicked
  lineHeightButton.addEventListener("click", () => {
    // Get the current line-height state
    let currentState = parseInt(lineHeightButton.getAttribute("data-state"));

    // Cycle through 4 states (0 to 3)
    currentState = (currentState + 1) % 4;
    lineHeightButton.setAttribute("data-state", currentState); // Update the state

    // Remove all line-height classes
    document.body.classList.remove(
      "line-height-0",
      "line-height-1",
      "line-height-2",
      "line-height-3"
    );

    // Apply the appropriate line-height class based on the current state
    if (currentState === 0) {
      document.body.classList.add("line-height-0");
      lineHeightButton.textContent = "Line Height"; // Default text
    } else if (currentState === 1) {
      document.body.classList.add("line-height-1");
      lineHeightButton.textContent = "Line Height (1.6x)"; // Light line-height
    } else if (currentState === 2) {
      document.body.classList.add("line-height-2");
      lineHeightButton.textContent = "Line Height (1.8x)"; // Moderate line-height
    } else if (currentState === 3) {
      document.body.classList.add("line-height-3");
      lineHeightButton.textContent = "Line Height (2x)"; // Heavy line-height
    }
  });
});

// Alignment Button
document.addEventListener("DOMContentLoaded", () => {
  const alignmentButton = document.getElementById("alignment-toggle");

  alignmentButton.addEventListener("click", () => {
    let currentState = parseInt(alignmentButton.getAttribute("data-state"));

    // Cycle through 4 states (0 to 3) for alignment
    currentState = (currentState + 1) % 4;
    alignmentButton.setAttribute("data-state", currentState); // Update the state

    // Remove all alignment classes
    document.body.classList.remove(
      "align-default",
      "align-left",
      "align-center",
      "align-right"
    );

    // Apply the appropriate alignment class
    if (currentState === 0) {
      document.body.classList.add("align-default");
      alignmentButton.textContent = "Text Align";
    } else if (currentState === 1) {
      document.body.classList.add("align-left");
      alignmentButton.textContent = "Align Left";
    } else if (currentState === 2) {
      document.body.classList.add("align-center");
      alignmentButton.textContent = "Align Center";
    } else if (currentState === 3) {
      document.body.classList.add("align-right");
      alignmentButton.textContent = "Align Right";
    }
  });
});

// Undo Button Functionality
document.addEventListener("DOMContentLoaded", () => {
  const resetButton = document.getElementById("accessibility-reset-button");

  resetButton.addEventListener("click", () => {
    // Reset all buttons with a "data-state" attribute
    const buttons = document.querySelectorAll("[data-state]");
    buttons.forEach((button) => {
      // Reset state to 0
      button.setAttribute("data-state", 0);

      // Update text to the default state label (customize as needed)
      if (button.id === "line-spacing-toggle") {
        button.textContent = "Line Spacing";
      } else if (button.id === "alignment-toggle") {
        button.textContent = "Text Align";
      } else if (button.id === "font-size-toggle") {
        button.textContent = "Font Size";
      } else if (button.id === "contrast-toggle") {
        button.textContent = "Contrast";
      } else if (button.id === "line-height-toggle") {
        button.textContent = "Line Height";
      }
    });

    // Remove accessibility-related classes from the body
    document.body.classList.remove(
      "dark-contrast",
      "light-contrast",
      "text-spacing-1",
      "text-spacing-2",
      "text-spacing-3",
      "line-height-1",
      "line-height-2",
      "line-height-3",
      "align-left",
      "align-center",
      "align-right",
      "align-justify"
    );

    // Reset any inline styles applied to the body
    document.body.style.fontSize = "";
    document.body.style.lineHeight = "";
    document.body.style.textAlign = "";

    // Optionally log the reset action
    console.log(
      "All accessibility settings and button states have been reset."
    );
  });
});
// Trevor's code end
