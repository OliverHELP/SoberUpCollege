// Attributed to Claude 

$(document).ready(function() {
    // State management
    let personalInfo = {
        gender: '',
        weight: 0
    };
    let drinkGroups = {};
    let timerInterval;
    let updateInterval;

    // Constants
    const METABOLISM_RATE = 0.015; // BAC reduction per hour
    const ALCOHOL_DENSITY = 0.789; // g/ml
    const ML_PER_OZ = 29.5735;
    const GENDER_CONSTANTS = {
        male: 0.68,
        female: 0.55
    };

    // Event Handlers
    $('#saveInfo').click(function() {
        const gender = $('#gender').val();
        const weight = parseFloat($('#weight').val());

        if (!gender || !weight) {
            $('#personalInfoError').show();
            return;
        }

        personalInfo.gender = gender;
        personalInfo.weight = weight;
        $('#personalInfoError').hide();
        alert('Personal information saved!');
    });

    $('#addDrink').click(function() {
        if (!personalInfo.gender || !personalInfo.weight) {
            alert('Please save personal information first!');
            return;
        }

        const name = $('#drinkName').val();
        const abv = parseFloat($('#abv').val());
        const oz = parseFloat($('#oz').val());

        if (!name || !abv || !oz) {
            $('#drinkError').show();
            return;
        }

        addDrinkToGroup({
            name: name,
            abv: abv,
            oz: oz
        });

        // Clear inputs
        $('#drinkName').val('');
        $('#abv').val('');
        $('#oz').val('');
        $('#drinkError').hide();
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
                count: 0
            };
        }
        
        drinkGroups[drinkKey].timestamps.push(new Date());
        drinkGroups[drinkKey].count++;
        
        updateDrinksList();
        startActiveUpdates();
    }

    function updateDrinksList() {
        const drinksList = $('#drinksList');
        drinksList.empty();

        Object.keys(drinkGroups).forEach(key => {
            const group = drinkGroups[key];
            const timestamps = group.timestamps
                .map(t => t.toLocaleTimeString())
                .join(', ');

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
        $('.up-arrow').click(function() {
            const key = $(this).data('key');
            const group = drinkGroups[key];
            addDrinkToGroup({
                name: group.name,
                abv: group.abv,
                oz: group.oz
            });
        });
    }

    // BAC Calculation Functions
    function calculateAlcoholGrams(drink) {
        return (drink.oz * drink.abv/100 * ML_PER_OZ) * ALCOHOL_DENSITY;
    }

    function calculateBAC() {
        if (Object.keys(drinkGroups).length === 0) return 0;

        let totalAlcohol = 0;
        const currentTime = new Date();
        const genderConstant = GENDER_CONSTANTS[personalInfo.gender];

        Object.values(drinkGroups).forEach(group => {
            group.timestamps.forEach(timestamp => {
                const alcoholGrams = calculateAlcoholGrams(group);
                const hoursElapsed = (currentTime - timestamp) / (1000 * 60 * 60);
                const remainingAlcohol = Math.max(0, alcoholGrams - (METABOLISM_RATE * hoursElapsed));
                totalAlcohol += remainingAlcohol;
            });
        });

        const bac = (totalAlcohol * 100) / (personalInfo.weight * 453.592 * genderConstant);
        return Math.max(0, bac);
    }

    // Timer Functions
    function formatTime(hours) {
        const wholehours = Math.floor(hours);
        const minutes = Math.floor((hours - wholehours) * 60);
        const seconds = Math.floor(((hours - wholehours) * 60 - minutes) * 60);

        return `${wholehours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function updateBAcAndTimer() {
        const currentBAC = calculateBAC();
        $('#currentBAC').text(currentBAC.toFixed(3));

        if (currentBAC <= 0) {
            $('#timeRemaining').text('0:00:00');
            stopActiveUpdates();
            return;
        }

        const hoursRemaining = currentBAC / METABOLISM_RATE;
        $('#timeRemaining').text(formatTime(hoursRemaining));
    }

    function startActiveUpdates() {
        // Clear existing intervals
        stopActiveUpdates();

        // Start new intervals
        updateInterval = setInterval(updateBAcAndTimer, 1000);
        
        // Initial update
        updateBAcAndTimer();
    }

    function stopActiveUpdates() {
        clearInterval(updateInterval);
    }
});