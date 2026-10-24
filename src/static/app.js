document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityCards = new Map();
  let messageTimeout;

  function showMessage(message, className) {
    messageDiv.textContent = message;
    messageDiv.className = className;
    messageDiv.classList.remove("hidden");

    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function unregisterParticipant(activityName, participant) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(participant)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        showMessage(result.detail || "An error occurred", "error");
        return;
      }

      const activityCard = activityCards.get(activityName);
      if (activityCard) {
        activityCard.participants = activityCard.participants.filter(
          (email) => email !== participant
        );
        renderParticipants(
          activityCard.card.querySelector(".participant-list"),
          activityCard.participants,
          activityName
        );
        const spotsLeft =
          activityCard.maxParticipants - activityCard.participants.length;
        activityCard.card.querySelector(".spots-left").textContent = spotsLeft;
      }

      showMessage(result.message, "success");
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  }

  function renderParticipants(list, participants, activityName) {
    list.replaceChildren();

    if (participants.length === 0) {
      const emptyMessage = document.createElement("li");
      emptyMessage.className = "empty-participants";
      emptyMessage.textContent = "No participants yet";
      list.appendChild(emptyMessage);
      return;
    }

    participants.forEach((participant) => {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = participant;
      item.appendChild(name);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "participant-remove";
      removeButton.textContent = "🗑";
      removeButton.setAttribute("aria-label", `Unregister ${participant}`);
      removeButton.title = "Unregister participant";
      removeButton.addEventListener("click", () => {
        removeButton.disabled = true;
        unregisterParticipant(activityName, participant).finally(() => {
          if (removeButton.isConnected) {
            removeButton.disabled = false;
          }
        });
      });
      item.appendChild(removeButton);
      list.appendChild(item);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activityCards.clear();
      activitySelect.querySelectorAll('option:not([value=""])').forEach((option) => {
        option.remove();
      });

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          <div class="participants-section">
            <h5>Participants</h5>
            <ul class="participant-list"></ul>
          </div>
        `;

        renderParticipants(
          activityCard.querySelector(".participant-list"),
          details.participants,
          name
        );
        activityCards.set(name, {
          card: activityCard,
          maxParticipants: details.max_participants,
          participants: details.participants,
        });
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      return true;
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
      return false;
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const refreshed = await fetchActivities();
        signupForm.reset();
        showMessage(
          refreshed
            ? result.message
            : `${result.message}, but the activity list could not be refreshed. Reload the page to see the update.`,
          refreshed ? "success" : "error"
        );
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
