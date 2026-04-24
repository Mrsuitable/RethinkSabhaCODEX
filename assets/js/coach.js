(function () {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const config = window.RETHINK_CONFIG || {};

  const form = byId("coachForm");
  if (!form) {
    return;
  }

  const input = byId("topic");
  const stance = byId("stanceMode");
  const result = byId("coachResult");
  const notice = byId("coachNotice");
  const error = byId("coachError");
  const submitText = byId("coachSubmitText");

  function showInfo(message) {
    if (!notice) {
      return;
    }
    notice.textContent = message;
    notice.classList.remove("hide");
  }

  function hideInfo() {
    if (notice) {
      notice.classList.add("hide");
      notice.textContent = "";
    }
  }

  function showError(message) {
    if (!error) {
      return;
    }
    error.textContent = message;
    error.classList.remove("hide");
  }

  function hideError() {
    if (error) {
      error.classList.add("hide");
      error.textContent = "";
    }
  }

  function renderResult(text) {
    if (!result) {
      return;
    }
    result.classList.remove("hide");
    result.textContent = text;
  }

  function buildFallback(topicValue, modeValue) {
    const modeLabel =
      modeValue === "for"
        ? "FOR"
        : modeValue === "against"
        ? "AGAINST"
        : "FOR and AGAINST";

    return [
      `Topic: ${topicValue}`,
      `Mode: ${modeLabel}`,
      "",
      "Quick prep framework:",
      "1. Define the core claim in one clear sentence.",
      "2. Add one evidence-backed argument (data, policy, or case study).",
      "3. Anticipate one strong counterpoint and rebut it with logic.",
      "4. Close with impact: who benefits, who pays, and in what timeframe.",
      "",
      "You can connect a real AI endpoint in assets/js/config.js to replace this fallback."
    ].join("\n");
  }

  async function callCoachApi(topicValue, modeValue) {
    if (!config.aiEndpoint) {
      return buildFallback(topicValue, modeValue);
    }

    const response = await fetch(config.aiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        topic: topicValue,
        mode: modeValue
      })
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      throw new Error("Coach API returned an invalid response.");
    }

    if (!response.ok) {
      throw new Error(payload?.error || "Coach API did not return success.");
    }

    if (!payload || typeof payload.answer !== "string") {
      throw new Error("Coach API returned an unexpected response.");
    }
    return payload.answer;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideInfo();
    hideError();

    const topicValue = String(input?.value || "").trim();
    const modeValue = String(stance?.value || "both");

    if (!topicValue) {
      showError("Please enter a debate topic first.");
      return;
    }

    if (result) {
      result.classList.add("hide");
      result.textContent = "";
    }

    if (submitText) {
      submitText.textContent = "Generating...";
    }

    try {
      const answer = await callCoachApi(topicValue, modeValue);
      renderResult(answer);
      if (!config.aiEndpoint) {
        showInfo("AI endpoint not configured yet, showing local fallback guidance.");
      }
    } catch (requestError) {
      showError(requestError.message || "Unable to generate coaching right now.");
    } finally {
      if (submitText) {
        submitText.textContent = "Get Coaching";
      }
    }
  });
})();
