function testCalc(blockW, blockH, settingW, settingH, minW, usePortrait, size) {
    let t = "landscape";
    const e = blockW, i = e / 2, s = blockH / 2, n = settingW / settingH;
    let h = settingW, r = settingH, o = i - h;
    if ("stretch" === size) {
        if (e < 2 * minW && usePortrait) {
            t = "portrait";
        }
        h = "portrait" === t ? e : e / 2;
        r = h / n;
        if (r > blockH) {
            r = blockH;
            h = r * n;
        }
        o = "portrait" === t ? i - h / 2 - h : i - h;
    } else {
        if (e < 2 * h && usePortrait) {
            t = "portrait";
            o = i - h / 2 - h;
        }
    }
    return { orientation: t, pageWidth: h, height: r, left: o };
}

console.log('Mobile 390x800, setting 380x600, minW 1000:', testCalc(390, 800, 380, 600, 1000, true, 'stretch'));
console.log('iPad 834x1100, setting 700x1000, minW 1000:', testCalc(834, 1100, 700, 1000, 1000, true, 'stretch'));
