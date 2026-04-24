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

  function detectDomain(topicValue) {
    const topic = topicValue.toLowerCase();

    if (topic.includes("school") || topic.includes("education") || topic.includes("classroom")) {
      return {
        name: "education",
        benefits: ["personalized learning", "teacher support", "student readiness"],
        risks: ["overdependence", "unequal access", "weaker critical thinking"],
        evidence: ["learning outcomes", "teacher workload", "digital access"]
      };
    }

    if (topic.includes("ai") || topic.includes("artificial intelligence")) {
      return {
        name: "technology",
        benefits: ["productivity", "access to expertise", "faster problem solving"],
        risks: ["misuse", "bias", "loss of human judgment"],
        evidence: ["case studies", "accuracy rates", "safety policies"]
      };
    }

    if (topic.includes("climate") || topic.includes("energy") || topic.includes("environment")) {
      return {
        name: "environment",
        benefits: ["long-term resilience", "lower public costs", "health protection"],
        risks: ["implementation cost", "political resistance", "uneven benefits"],
        evidence: ["emissions data", "cost-benefit studies", "local impact reports"]
      };
    }

    if (topic.includes("privacy") || topic.includes("data") || topic.includes("social media")) {
      return {
        name: "digital policy",
        benefits: ["user protection", "trust", "accountability"],
        risks: ["overregulation", "compliance cost", "free expression concerns"],
        evidence: ["consumer harm reports", "platform policy data", "legal precedents"]
      };
    }

    return {
      name: "public policy",
      benefits: ["fairness", "efficiency", "long-term social value"],
      risks: ["unintended consequences", "cost", "implementation difficulty"],
      evidence: ["credible statistics", "expert reports", "real-world examples"]
    };
  }

  function sideBlock(topicValue, side, domain) {
    const isFor = side === "FOR";
    const claimVerb = isFor ? "should be supported" : "should be challenged";
    const core = isFor ? domain.benefits : domain.risks;
    const opposing = isFor ? domain.risks : domain.benefits;

    return [
      `${side} position`,
      `Main claim: ${topicValue} ${claimVerb} because the strongest debate point is ${core[0]}.`,
      `Argument 1: Focus on ${core[0]}. Explain who benefits, how quickly, and why the benefit matters.`,
      `Argument 2: Use ${core[1]} as the practical impact. Connect it to students, citizens, or families.`,
      `Argument 3: Use ${core[2]} as the long-term impact. Show why waiting creates bigger costs later.`,
      `Counter to expect: Opponents will likely argue ${opposing[0]}.`,
      `Rebuttal: Accept the concern, then argue that clear rules, limited rollout, and measurement reduce that risk.`
    ].join("\n");
  }

  function buildFallback(topicValue, modeValue) {
    const modeLabel =
      modeValue === "for"
        ? "FOR"
        : modeValue === "against"
        ? "AGAINST"
        : "FOR and AGAINST";
    const domain = detectDomain(topicValue);
    const blocks = [];

    if (modeValue === "for" || modeValue === "both") {
      blocks.push(sideBlock(topicValue, "FOR", domain));
    }

    if (modeValue === "against" || modeValue === "both") {
      blocks.push(sideBlock(topicValue, "AGAINST", domain));
    }

    return [
      `Topic: ${topicValue}`,
      `Mode: ${modeLabel}`,
      `Detected lens: ${domain.name}`,
      "",
      blocks.join("\n\n"),
      "",
      "Evidence to search before speaking:",
      `1. ${domain.evidence[0]} for this topic`,
      `2. ${domain.evidence[1]} from a credible institution`,
      `3. ${domain.evidence[2]} in India or your local context`,
      "",
      "45-second closing draft:",
      `The real question is not only whether ${topicValue} sounds good in theory. The question is whether it improves outcomes while controlling the risks. A strong debate position should compare evidence, costs, fairness, and long-term impact. If I can show that my side protects people better and creates clearer benefits with fewer harms, then my side deserves support.`,
      "",
      "Built-in coach mode. Connect a private backend API later for full AI responses."
    ].join("\n");
  }

  function buildPrompt(topicValue, modeValue) {
    const modeLabel =
      modeValue === "for"
        ? "FOR only"
        : modeValue === "against"
        ? "AGAINST only"
        : "FOR and AGAINST";

    return [
      "Act as a sharp but student-friendly debate coach.",
      "Return plain text only.",
      `Topic: ${topicValue}`,
      `Mode: ${modeLabel}`,
      "",
      "Structure the answer like this:",
      "1. Frame the debate in one sentence",
      "2. Three strong arguments for the requested side",
      "3. Two likely counterarguments",
      "4. Rebuttals to those counterarguments",
      "5. A 45-second closing statement",
      "6. Search keywords for evidence"
    ].join("\n");
  }

  function extractPuterText(response) {
    if (typeof response === "string") {
      return response;
    }

    if (typeof response?.text === "string") {
      return response.text;
    }

    const content = response?.message?.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean)
        .join("\n");
    }

    return "";
  }

  async function callPuterCoach(topicValue, modeValue) {
    if (!window.puter?.ai?.chat) {
      throw new Error("Puter AI is not loaded yet.");
    }

    const prompt = buildPrompt(topicValue, modeValue);
    const models = ["google/gemini-2.5-flash", "gpt-4.1-nano"];
    let lastError;

    for (const model of models) {
      try {
        const response = await window.puter.ai.chat(prompt, { model });
        const answer = extractPuterText(response).trim();
        if (answer) {
          return answer;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No AI response was returned.");
  }

  async function callPollinationsCoach(topicValue, modeValue) {
    const prompt = buildPrompt(topicValue, modeValue);
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?seed=${Date.now()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Pollinations AI did not return success.");
    }

    const answer = (await response.text()).trim();
    if (!answer) {
      throw new Error("Pollinations AI returned an empty response.");
    }

    return answer;
  }

  async function callPublicAiCoach(topicValue, modeValue) {
    const providers = [callPollinationsCoach, callPuterCoach];
    let lastError;

    for (const provider of providers) {
      try {
        return await provider(topicValue, modeValue);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Public AI providers were unavailable.");
  }

  async function callCoachApi(topicValue, modeValue) {
    if (!config.aiEndpoint) {
      return callPublicAiCoach(topicValue, modeValue);
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
        showInfo("Generated with public no-key AI.");
      }
    } catch (requestError) {
      if (!config.aiEndpoint) {
        renderResult(buildFallback(topicValue, modeValue));
        showInfo("Public AI was busy, so the built-in coach generated this prep sheet.");
      } else {
        showError(requestError.message || "Unable to generate coaching right now.");
      }
    } finally {
      if (submitText) {
        submitText.textContent = "Get Coaching";
      }
    }
  });
})();
