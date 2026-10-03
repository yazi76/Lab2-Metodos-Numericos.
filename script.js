"use strict";

// Explicaciones y demostración del sistema fijo de las tres canteras.
const methods = {
  gauss: {
    type: "MÉTODO DIRECTO",
    title: "Simplificar, luego sustituir.",
    description: "La eliminación gaussiana transforma la matriz aumentada en una matriz triangular superior. Después, la sustitución regresiva permite obtener cada incógnita, desde la última hasta la primera.",
    note: "Ordenamos de mayor a menor según el coeficiente de x₁: 0.52, 0.30 y 0.18. El sistema ya está en ese orden. Al sustituir para hallar x₁ se necesitan tanto x₂ como x₃.",
    steps: [
      "Ordenar las ecuaciones según el coeficiente de x₁.",
      "Normalizar la primera ecuación.",
      "Restar a la segunda un múltiplo de la primera normalizada para eliminar x₁.",
      "Restar a la tercera un múltiplo de la primera normalizada para eliminar x₁.",
      "Normalizar la segunda ecuación.",
      "Eliminar x₂ de la tercera con la segunda normalizada y despejar x₃.",
      "Reemplazar x₃ en la segunda ecuación más reciente para encontrar x₂.",
      "Reemplazar x₂ y x₃ en la primera ecuación para encontrar x₁."
    ],
    expression: ["[ A | b ]", "[ U | c ]", "x"]
  },
  jordan: {
    type: "MÉTODO DIRECTO",
    title: "Reducir hasta la identidad.",
    description: "Gauss-Jordan normaliza cada pivote y elimina los coeficientes que están tanto arriba como abajo. Si el sistema tiene solución única, la matriz de coeficientes se convierte en la identidad y el vector solución se lee directamente.",
    note: "Seguimos diez pasos y reescribimos la matriz después de los pasos 4, 7 y 10. Al final se obtiene [I | x], con los mismos volúmenes que Gauss.",
    steps: [
      "Expresar los coeficientes como una matriz aumentada.",
      "Normalizar la primera ecuación.",
      "Usar la primera normalizada para eliminar x₁ de la segunda ecuación.",
      "Eliminar x₁ de la tercera ecuación y reescribir la matriz.",
      "Normalizar la segunda ecuación más reciente.",
      "Eliminar x₂ de la primera ecuación con la segunda normalizada.",
      "Eliminar x₂ de la tercera ecuación y reescribir la matriz.",
      "Normalizar la tercera ecuación más reciente.",
      "Eliminar x₃ de la primera ecuación con la tercera normalizada.",
      "Eliminar x₃ de la segunda ecuación y reescribir la matriz final."
    ],
    expression: ["[ A | b ]", "[ I | x ]", "x"]
  },
  seidel: {
    type: "MÉTODO ITERATIVO",
    title: "Resolver en ocho pasos.",
    description: "Ordenamos las ecuaciones y despejamos una incógnita en cada una. En la primera pasada tomamos x₂ y x₃ como cero; después sustituimos cada valor recién calculado en la ecuación siguiente. Repetimos la secuencia con los valores más recientes.",
    note: "Para este sistema, con vector inicial de ceros y tolerancia del 5%, el criterio se cumple en la cuarta iteración. La convergencia depende del sistema y del orden de las ecuaciones.",
    steps: [
      "Ordenar las ecuaciones.",
      "Despejar x₁ de la primera ecuación.",
      "Despejar x₂ de la segunda ecuación.",
      "Despejar x₃ de la tercera ecuación.",
      "Asumir x₂ = 0 y x₃ = 0 en la primera ecuación.",
      "Reemplazar x₁ en la segunda ecuación y asumir x₃ = 0.",
      "Reemplazar x₁ y x₂ en la tercera ecuación.",
      "Reemplazar los valores obtenidos y repetir en orden: x₁, x₂, x₃."
    ],
    expression: ["x⁽⁰⁾", "x⁽¹⁾", "x⁽²⁾ …"]
  }
};

// Se conserva toda la precisión interna; solo se redondea al mostrar.
function quarrySeidel(tolerance) {
  const coefficients = [[0.52, 0.20, 0.25], [0.30, 0.50, 0.20], [0.18, 0.30, 0.55]];
  const required = [4800, 5810, 5690];
  const values = [0, 0, 0];
  const iterations = [];
  for (let k = 1; k <= 100; k += 1) {
    const previous = values.slice();
    for (let i = 0; i < 3; i += 1) {
      let sum = 0;
      for (let j = 0; j < 3; j += 1) {
        if (i !== j) sum += coefficients[i][j] * (j < i ? values[j] : previous[j]);
      }
      values[i] = (required[i] - sum) / coefficients[i][i];
    }
    const errors = values.map((value, i) => value === 0
      ? (previous[i] === 0 ? 0 : Infinity)
      : 100 * Math.abs(value - previous[i]) / Math.abs(value));
    const error = Math.max(...errors);
    const residual = 100 * Math.max(...coefficients.map((row, i) =>
      Math.abs(row.reduce((sum, coefficient, j) => sum + coefficient * values[j], 0) - required[i]))) / Math.max(...required);
    iterations.push({ k, values: values.slice(), error, residual });
    if (error <= tolerance) break;
  }
  return iterations;
}

function showSeidel(tolerance) {
  const iterations = quarrySeidel(tolerance);
  const rows = document.getElementById("seidel-rows");
  rows.replaceChildren();
  iterations.forEach((iteration, index) => {
    const row = document.createElement("tr");
    if (index === iterations.length - 1) row.classList.add("final-iteration");
    [String(iteration.k), ...iteration.values.map((value) => value.toFixed(6)), iteration.error.toFixed(6)].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    });
    rows.append(row);
  });
  const last = iterations[iterations.length - 1];
  document.getElementById("seidel-summary").textContent =
    `Con tolerancia del ${tolerance}%, se detiene en la iteración ${last.k}: Ea máximo = ${last.error.toFixed(6)}% y residuo relativo global = ${last.residual.toFixed(6)}%.`;
}

const tabs = Array.from(document.querySelectorAll(".method-tab"));
const panel = document.getElementById("method-panel");

function selectMethod(tab) {
  const method = methods[tab.dataset.method];
  tabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  panel.setAttribute("aria-labelledby", tab.id);
  document.querySelectorAll(".worked-example").forEach((example) => {
    example.hidden = example.id !== `worked-${tab.dataset.method}`;
  });
  document.getElementById("method-type").textContent = method.type;
  document.getElementById("method-title").textContent = method.title;
  document.getElementById("method-description").textContent = method.description;
  document.getElementById("method-note").textContent = method.note;
  const steps = document.getElementById("method-steps");
  steps.replaceChildren();
  method.steps.forEach((text, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");
    item.append(number, document.createTextNode(text));
    steps.append(item);
  });
  const expression = document.getElementById("method-expression");
  expression.replaceChildren();
  method.expression.forEach((text, index) => {
    if (index > 0) {
      const separator = document.createElement("span");
      separator.textContent = "→";
      expression.append(separator);
    }
    expression.append(document.createTextNode(text));
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectMethod(tab));
  // Navegación por teclado conforme al patrón de pestañas accesibles.
  tab.addEventListener("keydown", (event) => {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    selectMethod(tabs[nextIndex]);
  });
});

document.getElementById("seidel-tolerance").addEventListener("change", (event) => {
  showSeidel(Number(event.target.value));
});
selectMethod(tabs[0]);
showSeidel(5);

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("navigation");

function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}

menuButton.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  navigation.classList.toggle("is-open", !expanded);
});
navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia("(min-width: 761px)").addEventListener("change", closeMenu);
// Sin JavaScript, los enlaces de navegación permanecen visibles.
document.documentElement.classList.add("js");

// Consola autónoma: adaptación de sistemas_lineales.cpp para sitios estáticos.
const terminalOutput = document.getElementById("terminal-output");
const terminalState = document.getElementById("terminal-state");
const terminalInput = document.getElementById("terminal-input");
const terminalSend = document.getElementById("terminal-send");
const terminalStart = document.getElementById("terminal-start");
const terminalExample = document.getElementById("terminal-example");
const terminalStop = document.getElementById("terminal-stop");
let terminalSession = null;
let terminalGeneration = 0;
let terminalBusy = false;

const consoleEPS = 1e-12;
const consoleNorm = (values) => Math.max(0, ...values.map(Math.abs));
const consoleNumber = (value) => value.toFixed(6);
function consoleMatrix(matrix) {
  return matrix.map((row) => "[ " + row.map((value, j) =>
    (j === row.length - 1 ? " | " : "") + consoleNumber(value).padStart(14)).join(" ") + " ]\n").join("");
}
function consoleResidual(a, b, x) {
  const residual = consoleNorm(a.map((row, i) =>
    row.reduce((sum, coefficient, j) => sum + coefficient * x[j], -b[i])));
  return consoleNorm(b) > 0 ? 100 * residual / consoleNorm(b) : residual;
}
function consoleResult(a, b, x) {
  let text = "\nRESULTADO\n" + x.map((value, i) => `x${i + 1} = ${consoleNumber(value)}\n`).join("");
  text += (consoleNorm(b) > 0 ? "Residuo relativo global (%) = " : "Residuo absoluto = ")
    + consoleResidual(a, b, x).toExponential(6) + "\nVerificación de las ecuaciones originales:\n";
  a.forEach((row, i) => {
    const obtained = row.reduce((sum, coefficient, j) => sum + coefficient * x[j], 0);
    text += `Fila ${i + 1}: obtenido = ${consoleNumber(obtained)}, requerido = ${consoleNumber(b[i])}, diferencia = ${(obtained - b[i]).toExponential(6)}\n`;
  });
  return text;
}
function* consoleRead(label, min = -Infinity, max = Infinity, integer = false) {
  while (true) {
    const input = yield { label };
    // Number() también acepta hexadecimal; aquí solo admitimos notación decimal.
    const valid = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(input);
    const value = Number(input);
    if (!valid || !Number.isFinite(value)) {
      yield "Entrada inválida. Usa un número finito con punto decimal.\n";
    } else if (value < min || value > max || (integer && !Number.isInteger(value))) {
      yield `Ingresa ${integer ? "un entero" : "un número"} entre ${min} y ${max}.\n`;
    } else {
      return value;
    }
  }
}
function* consoleDirect(a, b, jordan) {
  const n = a.length;
  const matrix = a.map((row, i) => [...row, b[i]]);
  const threshold = consoleEPS * Math.max(...a.map(consoleNorm));
  let pivotRow = 0;
  yield "\nMatriz aumentada inicial:\n" + consoleMatrix(matrix);
  for (let col = 0; col < n && pivotRow < n; col += 1) {
    let p = pivotRow;
    if (Math.abs(matrix[p][col]) <= threshold) {
      const candidate = matrix.findIndex((row, i) => i > pivotRow && Math.abs(row[col]) > threshold);
      if (candidate >= 0) p = candidate;
    }
    if (Math.abs(matrix[p][col]) <= threshold) continue;
    if (p !== pivotRow) {
      [matrix[p], matrix[pivotRow]] = [matrix[pivotRow], matrix[p]];
      yield `F${pivotRow + 1} ↔ F${p + 1}\n` + consoleMatrix(matrix);
    }
    if (jordan || pivotRow < n - 1) {
      const pivot = matrix[pivotRow][col];
      for (let j = col; j <= n; j += 1) matrix[pivotRow][j] /= pivot;
      matrix[pivotRow][col] = 1;
      yield `Normalización: F${pivotRow + 1} ← F${pivotRow + 1} / ${consoleNumber(pivot)}\n` + consoleMatrix(matrix);
    }
    for (let i = jordan ? 0 : pivotRow + 1; i < n; i += 1) {
      if (i === pivotRow || matrix[i][col] === 0) continue;
      const factor = matrix[i][col] / matrix[pivotRow][col];
      yield `Ecuación actual F${i + 1}:\n` + consoleMatrix([matrix[i]])
        + `Multiplicar F${pivotRow + 1} por ${consoleNumber(-factor)}:\n`
        + consoleMatrix([matrix[pivotRow].map((value) => -factor * value)]);
      for (let j = col; j <= n; j += 1) matrix[i][j] -= factor * matrix[pivotRow][j];
      matrix[i][col] = 0;
      if (!matrix.every((row) => row.every(Number.isFinite))) throw new Error("Desbordamiento numérico; revisa las escalas.");
      yield `F${i + 1} ← F${i + 1} − (${consoleNumber(factor)}) F${pivotRow + 1}\nMatriz resultante:\n` + consoleMatrix(matrix);
    }
    pivotRow += 1;
  }
  if (pivotRow < n) {
    yield matrix.slice(pivotRow).some((row) => Math.abs(row[n]) > consoleEPS * consoleNorm(b))
      ? "Sistema incompatible: no tiene solución.\n"
      : "Sistema indeterminado: infinitas soluciones.\n";
    return;
  }
  const x = Array(n).fill(0);
  if (jordan) {
    yield "Matriz final [I | x]:\n" + consoleMatrix(matrix);
    for (let i = 0; i < n; i += 1) x[i] = matrix[i][n];
  } else {
    yield "Matriz triangular final:\n" + consoleMatrix(matrix) + "Sustitución regresiva:\n";
    for (let i = n - 1; i >= 0; i -= 1) {
      let sum = 0;
      let expression = `x${i + 1} = (${consoleNumber(matrix[i][n])}`;
      for (let j = i + 1; j < n; j += 1) {
        sum += matrix[i][j] * x[j];
        expression += ` − (${consoleNumber(matrix[i][j])} * ${consoleNumber(x[j])})`;
      }
      x[i] = (matrix[i][n] - sum) / matrix[i][i];
      yield expression + `) / ${consoleNumber(matrix[i][i])} = ${consoleNumber(x[i])}\n`;
    }
  }
  if (!x.every(Number.isFinite)) throw new Error("Desbordamiento numérico; revisa las escalas.");
  yield consoleResult(a, b, x);
}
function* consoleSeidel(a, b) {
  const n = a.length;
  const threshold = consoleEPS * Math.max(...a.map(consoleNorm));
  for (let i = 0; i < n; i += 1) {
    if (Math.abs(a[i][i]) <= threshold) {
      yield `No se puede despejar x${i + 1}: su coeficiente diagonal es cero.\nReordena las ecuaciones o selecciona un método directo.\n`;
      return;
    }
  }
  yield "\nMatriz usada por Gauss-Seidel:\n" + consoleMatrix(a.map((row, i) => [...row, b[i]]))
    + "Despeje de cada incógnita:\n";
  for (let i = 0; i < n; i += 1) {
    yield `x${i + 1} = (${b[i]}` + a[i].map((coefficient, j) =>
      i === j ? "" : ` − (${coefficient} * x${j + 1})`).join("") + `) / ${a[i][i]}\n`;
  }
  yield "Tolerancia del error aproximado: 5%\n";
  const maxIterations = yield* consoleRead("Máximo de iteraciones (1–100000): ", 1, 100000, true);
  const x = Array(n).fill(0);
  yield "Vector inicial de ceros:\n" + x.map((value, i) => `x${i + 1}^(0) = 0\n`).join("")
    + "Ea_i = |(x_i actual − x_i anterior) / x_i actual| * 100\nSe detiene cuando todos los Ea_i ≤ 5%.\nEste error aproximado no es el error verdadero.\n";
  for (let k = 1; k <= maxIterations; k += 1) {
    const previous = x.slice();
    yield `\nITERACIÓN ${k}\n`;
    for (let i = 0; i < n; i += 1) {
      let sum = 0;
      let expression = `x${i + 1} = (${consoleNumber(b[i])}`;
      for (let j = 0; j < n; j += 1) {
        if (i === j) continue;
        const value = j < i ? x[j] : previous[j];
        sum += a[i][j] * value;
        expression += ` − (${consoleNumber(a[i][j])} * ${consoleNumber(value)})`;
      }
      x[i] = (b[i] - sum) / a[i][i];
      if (!Number.isFinite(x[i])) {
        yield "Desbordamiento: iteración detenida.\n";
        return;
      }
      yield expression + `) / ${consoleNumber(a[i][i])} = ${consoleNumber(x[i])}\n`;
    }
    let error = 0;
    yield "Matriz del vector actual [x^(k)]:\n";
    for (let i = 0; i < n; i += 1) {
      const change = Math.abs(x[i] - previous[i]);
      const e = x[i] !== 0 ? 100 * change / Math.abs(x[i]) : change === 0 ? 0 : Infinity;
      error = Math.max(error, e);
      yield `[ ${consoleNumber(x[i])} ]\nEa${i + 1} = |(${consoleNumber(x[i])} − ${consoleNumber(previous[i])}) / ${consoleNumber(x[i])}| * 100 = `
        + (x[i] === 0 ? (change === 0 ? "0% (sin cambio)" : "indefinido (se continúa)") : `${consoleNumber(e)}%`) + "\n";
    }
    yield `Ea máximo (%) = ${consoleNumber(error)}\n`
      + (consoleNorm(b) > 0 ? "Residuo relativo global (%) = " : "Residuo absoluto = ")
      + consoleResidual(a, b, x).toExponential(6) + "\n";
    if (error <= 5) {
      yield `Criterio de parada cumplido en ${k} iteraciones.\n` + consoleResult(a, b, x);
      return;
    }
  }
  yield "Límite alcanzado: no se cumplió el criterio de parada.\nLa siguiente es solo la última aproximación:\n" + consoleResult(a, b, x);
}
function* consoleProgram() {
  yield "SISTEMAS LINEALES CUADRADOS Ax = b\nUsa punto decimal. Porcentajes: 52% se ingresa como 0.52.\n";
  // Un límite explícito mantiene manejable la entrada y salida en el navegador.
  const n = yield* consoleRead("Cantidad de ecuaciones (1–50): ", 1, 50, true);
  const m = yield* consoleRead("Cantidad de incógnitas (1–50): ", 1, 50, true);
  if (n !== m) {
    yield "Se requiere un sistema cuadrado: ecuaciones = incógnitas.\n";
    return;
  }
  const a = Array.from({ length: n }, () => Array(n).fill(0));
  const b = Array(n).fill(0);
  yield "Introduce cada fila: coeficientes y término independiente.\n";
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) a[i][j] = yield* consoleRead(`a[${i + 1}][${j + 1}]: `);
    b[i] = yield* consoleRead(`b[${i + 1}]: `);
  }
  while (true) {
    yield "\n1. Eliminación gaussiana\n2. Gauss-Jordan\n3. Gauss-Seidel\n0. Salir\n";
    const option = yield* consoleRead("Método: ", 0, 3, true);
    if (option === 0) return;
    if (option === 3) yield* consoleSeidel(a, b);
    else yield* consoleDirect(a, b, option === 2);
  }
}
function appendTerminal(text) {
  terminalOutput.textContent += text;
  if (terminalOutput.textContent.length > 200000) {
    terminalOutput.textContent = "[Se conserva la salida más reciente.]\n" + terminalOutput.textContent.slice(-180000);
  }
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}
function terminalControls() {
  terminalInput.disabled = !terminalSession || terminalBusy;
  terminalSend.disabled = !terminalSession || terminalBusy;
  // Reiniciar y detener siguen disponibles durante un cálculo largo.
  terminalStop.disabled = !terminalSession;
}
async function runTerminal(tokens = []) {
  const session = terminalSession;
  const generation = terminalGeneration;
  terminalBusy = true;
  terminalState.textContent = "Calculando…";
  terminalControls();
  let pending = "";
  let steps = 0;
  try {
    while (generation === terminalGeneration) {
      let next;
      if (session.waiting) {
        if (!tokens.length) {
          appendTerminal(pending);
          pending = "";
          terminalState.textContent = "Esperando entrada";
          break;
        }
        const value = tokens.shift();
        pending += value + "\n";
        session.waiting = false;
        next = session.iterator.next(value);
      } else {
        next = session.iterator.next();
      }
      if (next.done) {
        appendTerminal(pending + "\n[Fin de la sesión. Puedes iniciar otra.]\n");
        pending = "";
        terminalSession = null;
        terminalState.textContent = "Finalizado";
        break;
      }
      if (typeof next.value === "string") {
        pending += next.value;
        session.outputSize += next.value.length;
        if (session.outputSize > 4 * 1024 * 1024) throw new Error("Límite de salida alcanzado. Reinicia con menos iteraciones o un sistema más pequeño.");
      } else {
        session.waiting = true;
        session.prompt = next.value.label;
        pending += session.prompt;
      }
      // Ceder al navegador permite pintar la salida y pulsar Detener.
      if (++steps % 40 === 0) {
        appendTerminal(pending);
        pending = "";
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  } catch (error) {
    if (generation === terminalGeneration) {
      appendTerminal(pending + `\n${error.message}\n`);
      terminalSession = null;
      terminalState.textContent = "Detenido";
    }
  } finally {
    if (generation === terminalGeneration) {
      terminalBusy = false;
      terminalControls();
      if (terminalSession) terminalInput.focus();
    }
  }
}
function startTerminal(withExample) {
  terminalGeneration += 1;
  terminalSession = { iterator: consoleProgram(), waiting: false, outputSize: 0 };
  terminalOutput.textContent = "";
  terminalInput.value = "";
  return runTerminal(withExample
    ? "3 3 0.52 0.20 0.25 4800 0.30 0.50 0.20 5810 0.18 0.30 0.55 5690".split(" ") : []);
}
terminalStart.addEventListener("click", () => startTerminal(false));
terminalExample.addEventListener("click", () => startTerminal(true));
document.getElementById("terminal-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (!terminalSession || terminalBusy || !terminalInput.value.trim()) return;
  const tokens = terminalInput.value.trim().split(/\s+/);
  terminalInput.value = "";
  runTerminal(tokens);
});
terminalStop.addEventListener("click", () => {
  terminalGeneration += 1;
  terminalSession = null;
  terminalBusy = false;
  appendTerminal("\n[Sesión detenida.]\n");
  terminalState.textContent = "Detenido";
  terminalControls();
});
document.getElementById("terminal-clear").addEventListener("click", () => {
  terminalOutput.textContent = "";
  if (terminalSession?.waiting) appendTerminal(terminalSession.prompt);
});
