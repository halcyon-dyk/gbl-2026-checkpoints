const WIDTH = 405;
const HEIGHT = 720;

class CombatEffects {
  constructor(scene) {
    this.scene = scene;
    this.particles = Array.from({ length: 48 }, () => scene.add.circle(-100, -100, 3, 0xffffff).setDepth(30).setVisible(false));
    this.damageTexts = Array.from({ length: 18 }, () => scene.add.text(-100, -100, '', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#51202a', strokeThickness: 3 }).setOrigin(0.5).setDepth(31).setVisible(false));
    this.particleCursor = 0;
    this.textCursor = 0;
  }

  burst(x, y, color, count = 8, spread = 34) {
    for (let i = 0; i < count; i++) {
      const particle = this.particles[this.particleCursor++ % this.particles.length];
      this.scene.tweens.killTweensOf(particle);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(Math.floor(spread * 0.45), spread);
      particle.setPosition(x, y).setRadius(Phaser.Math.Between(2, 4)).setFillStyle(color).setAlpha(1).setScale(1).setVisible(true);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: Phaser.Math.Between(220, 360),
        ease: 'Quad.Out',
        onComplete: () => particle.setVisible(false)
      });
    }
  }

  damageNumber(x, y, damage) {
    const text = this.damageTexts[this.textCursor++ % this.damageTexts.length];
    this.scene.tweens.killTweensOf(text);
    text.setText(`-${damage}`).setPosition(x, y).setAlpha(1).setScale(1).setVisible(true);
    this.scene.tweens.add({
      targets: text,
      x: x + Phaser.Math.Between(-28, 28),
      y: y + Phaser.Math.Between(38, 68),
      alpha: 0,
      scale: 0.75,
      duration: 650,
      ease: 'Quad.In',
      onComplete: () => text.setVisible(false)
    });
  }
}

class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
  }

  preload() {
    this.load.json('stages', 'data/stages.json');
  }

  create() {
    const stageData = this.cache.json.get('stages');
    this.enemyTypes = stageData.enemyTypes;
    this.stage = stageData.stages[0];
    this.castleHp = 100;
    this.gold = 0;
    this.wave = 1;
    this.ammo = 3;
    this.active = true;
    this.enemies = [];
    this.pendingSpawns = 0;

    this.drawBackground();
    this.createHud();
    this.createCastleAndHero();
    this.effects = new CombatEffects(this);
    this.input.on('pointerdown', pointer => this.manualAttack(pointer));
    this.time.addEvent({ delay: 500, loop: true, callback: this.autoAttack, callbackScope: this });
    this.time.addEvent({ delay: 2400, loop: true, callback: this.rechargeAmmo, callbackScope: this });
    this.startWave();
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x6abf4b, 0x6abf4b, 0x2e8541, 0x2e8541, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x95d95f, 0.28);
    for (let y = 55; y < HEIGHT; y += 32) {
      for (let x = 115 + (y % 3) * 7; x < WIDTH; x += 38) g.fillCircle(x, y, 3);
    }
    g.fillStyle(0x8e673d, 0.75);
    g.fillRect(102, 0, 52, HEIGHT);
    g.lineStyle(2, 0xb78c58, 0.7);
    for (let y = -30; y < HEIGHT; y += 44) g.lineBetween(102, y, 154, y + 28);
  }

  createHud() {
    this.add.rectangle(WIDTH / 2, 16, WIDTH - 12, 24, 0x10243a, 0.78).setStrokeStyle(1, 0xc8d9ac, 0.7);
    const heart = this.add.graphics();
    heart.fillStyle(0xff6070).fillCircle(14, 13, 5).fillCircle(21, 13, 5).fillTriangle(9, 14, 26, 14, 17.5, 23);
    this.hpBack = this.add.rectangle(32, 16, 86, 13, 0x531f2b).setOrigin(0, 0.5);
    this.hpFill = this.add.rectangle(32, 16, 86, 13, 0xe84858).setOrigin(0, 0.5);
    this.hpText = this.add.text(75, 16, '', { fontSize: '10px', fontStyle: 'bold', color: '#ffffff', stroke: '#55111b', strokeThickness: 2 }).setOrigin(0.5);
    this.ammoText = this.add.text(WIDTH / 2, 16, '', { fontSize: '11px', fontStyle: 'bold', color: '#e7f1ff' }).setOrigin(0.5);
    const slime = this.add.graphics();
    slime.fillStyle(0x8c6be8).fillCircle(337, 17, 8).fillTriangle(329, 18, 345, 18, 337, 7);
    slime.fillStyle(0xffffff).fillCircle(334, 16, 2).fillCircle(340, 16, 2);
    this.monsterText = this.add.text(350, 16, '', { fontSize: '11px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0, 0.5);
    this.message = this.add.text(WIDTH / 2, 63, '', { fontSize: '25px', fontStyle: 'bold', color: '#ffffff', stroke: '#17213d', strokeThickness: 6 }).setOrigin(0.5).setDepth(10);
    this.announcement = this.add.text(-120, HEIGHT / 2, '', { fontSize: '36px', fontStyle: 'bold', color: '#fff5a6', stroke: '#49391d', strokeThickness: 7 }).setOrigin(0.5).setDepth(20).setVisible(false);
    this.updateHud();
  }

  createCastleAndHero() {
    const castle = this.add.container(0, 38);
    const stone = this.add.graphics();
    stone.fillStyle(0xa9b4c4).fillRect(0, 20, 104, HEIGHT - 58);
    stone.fillStyle(0xced5dc).fillRect(0, 20, 104, 14);
    stone.fillStyle(0x536178).fillRect(0, 20, 14, 18).fillRect(30, 20, 14, 18).fillRect(60, 20, 14, 18).fillRect(90, 20, 14, 18);
    stone.fillStyle(0x7b8899).fillRect(45, HEIGHT - 118, 30, 80);
    stone.fillStyle(0x58677d).fillRect(16, 76, 18, 26).fillRect(70, 150, 18, 26).fillRect(16, 300, 18, 26).fillRect(70, 420, 18, 26);
    castle.add(stone);
    this.hero = this.add.container(77, 82);
    const body = this.add.graphics();
    body.fillStyle(0xf2c49c).fillCircle(0, -25, 14);
    body.fillStyle(0x5a80d5).fillTriangle(-21, 14, 0, -13, 21, 14).fillRect(-13, 10, 26, 18);
    body.lineStyle(5, 0xd9e8fc).lineBetween(14, -3, 40, -29);
    this.hero.add(body);
  }

  startWave() {
    if (!this.active) return;
    this.playScreenSweep(`WAVE ${this.wave}`);
    const wave = this.stage.waves[this.wave - 1];
    this.pendingSpawns = wave.spawns.reduce((total, spawn) => total + spawn.count, 0);
    let delay = 700;
    wave.spawns.forEach(spawn => {
      for (let i = 0; i < spawn.count; i++) {
        this.time.delayedCall(delay, () => this.spawnEnemy(spawn.type));
        delay += spawn.interval;
      }
    });
  }

  spawnEnemy(type) {
    this.pendingSpawns--;
    if (!this.active) return;
    const definition = this.enemyTypes[type];
    const enemy = {
      type, hp: definition.hp, maxHp: definition.hp, speed: definition.speed, size: definition.size,
      color: definition.color, castleDamage: definition.castleDamage,
      autoDamageMultiplier: definition.autoDamageMultiplier, manualDamageMultiplier: definition.manualDamageMultiplier,
      knockedBack: false,
      body: this.add.container(440, Phaser.Math.Between(105, 650))
    };
    const art = this.add.graphics();
    const { color, size } = enemy;
    art.fillStyle(color).fillCircle(0, 0, size).fillTriangle(-size, -size + 4, -size + 4, -size * 1.8).fillTriangle(size, -size + 4, size - 4, -size * 1.8);
    art.fillStyle(0xffffff).fillCircle(-size / 3, -2, 3).fillCircle(size / 3, -2, 3);
    enemy.body.add(art);
    enemy.bar = this.add.rectangle(enemy.body.x - size, enemy.body.y - size - 13, size * 2, 5, 0xe95868).setOrigin(0, 0.5);
    enemy.body.setData('enemy', enemy);
    this.enemies.push(enemy);
    this.updateHud();
  }

  update(_, delta) {
    if (!this.active) return;
    this.enemies.slice().forEach(enemy => {
      if (enemy.knockedBack) return;
      enemy.body.x -= enemy.speed * delta / 1000;
      enemy.bar.x = enemy.body.x - enemy.size;
      enemy.bar.y = enemy.body.y - enemy.size - 13;
      if (enemy.body.x < 108) this.hitCastle(enemy);
    });
  }

  autoAttack() {
    if (!this.active || !this.enemies.length) return;
    const target = this.enemies.reduce((a, b) => a.body.x < b.body.x ? a : b);
    this.fireProjectile(target, 9, 0x9ed8ff);
  }

  manualAttack(pointer) {
    if (!this.active || this.ammo === 0 || !this.enemies.length) return;
    this.ammo--;
    const target = this.enemies.reduce((nearest, enemy) => {
      const d = Phaser.Math.Distance.Between(pointer.x, pointer.y, enemy.body.x, enemy.body.y);
      const current = Phaser.Math.Distance.Between(pointer.x, pointer.y, nearest.body.x, nearest.body.y);
      return d < current ? enemy : nearest;
    });
    this.fireProjectile(target, 27, 0xffd35c, true);
    this.updateHud();
  }

  fireProjectile(target, damage, color, isStrong = false) {
    if (!this.enemies.includes(target)) return;
    this.animateHeroShot(isStrong);
    if (isStrong) this.effects.burst(this.hero.x + 24, this.hero.y - 23, 0xffdb65, 16, 58);
    const bolt = this.add.circle(this.hero.x + 24, this.hero.y - 23, isStrong ? 11 : 7, color).setStrokeStyle(2, 0xffffff).setDepth(8);
    this.tweens.add({ targets: bolt, x: target.body.x, y: target.body.y, duration: 105, onComplete: () => {
      bolt.destroy();
      this.damageEnemy(target, damage, isStrong ? 'manual' : 'auto');
    }});
  }

  damageEnemy(enemy, damage, attackType) {
    if (!this.enemies.includes(enemy)) return;
    const finalDamage = Math.max(1, Math.round(damage * enemy[`${attackType}DamageMultiplier`]));
    enemy.hp -= finalDamage;
    this.effects.damageNumber(enemy.body.x, enemy.body.y - enemy.size - 14, finalDamage);
    this.tweens.add({ targets: enemy.body, x: enemy.body.x + 7, yoyo: true, duration: 45, repeat: 1 });
    if (enemy.hp <= 0) {
      this.gold += 8;
      this.effects.burst(enemy.body.x, enemy.body.y, enemy.color, enemy.type === 'armored' ? 15 : 9, enemy.type === 'armored' ? 52 : 32);
      enemy.body.destroy(); enemy.bar.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      this.updateHud();
      this.checkWaveClear();
    } else {
      enemy.bar.displayWidth = enemy.size * 2 * enemy.hp / enemy.maxHp;
    }
  }

  hitCastle(enemy) {
    this.castleHp = Math.max(0, this.castleHp - enemy.castleDamage);
    enemy.knockedBack = true;
    enemy.body.x = 108;
    this.tweens.add({
      targets: enemy.body,
      x: 174,
      duration: 330,
      ease: 'Back.Out',
      onUpdate: () => { enemy.bar.x = enemy.body.x - enemy.size; },
      onComplete: () => { if (this.active) enemy.knockedBack = false; }
    });
    this.updateHud();
    if (this.castleHp === 0) this.finish('게임 오버');
  }

  animateHeroShot(isStrong) {
    this.tweens.killTweensOf(this.hero);
    this.hero.setScale(1);
    this.tweens.add({ targets: this.hero, scale: isStrong ? 1.28 : 1.12, duration: 75, yoyo: true, ease: 'Quad.Out' });
  }

  playScreenSweep(text) {
    this.tweens.killTweensOf(this.announcement);
    this.announcement.setText(text).setPosition(-120, HEIGHT / 2).setScale(0.8).setAlpha(1).setVisible(true);
    this.tweens.timeline({
      targets: this.announcement,
      tweens: [
        { x: WIDTH / 2, duration: 420, ease: 'Cubic.Out' },
        { scale: 1.25, duration: 180 },
        { hold: 500 },
        { x: WIDTH + 130, alpha: 0, duration: 420, ease: 'Cubic.In', onComplete: () => this.announcement.setVisible(false) }
      ]
    });
  }

  rechargeAmmo() {
    if (this.active && this.ammo < 3) { this.ammo++; this.updateHud(); }
  }

  checkWaveClear() {
    if (!this.enemies.length && this.pendingSpawns === 0) {
      if (this.wave === this.stage.waves.length) this.finish('전투 승리!');
      else { this.wave++; this.time.delayedCall(1400, () => this.startWave()); }
    }
  }

  finish(text) {
    this.active = false;
    this.message.setText(text).setAlpha(1);
    this.add.text(WIDTH / 2, 182, text === '전투 승리!' ? '정비 씬은 다음 단계에서 연결됩니다.' : '새로고침하여 다시 도전하세요.', { fontSize: '14px', color: '#e6efff' }).setOrigin(0.5).setDepth(10);
  }

  updateHud() {
    this.hpText.setText(`${this.castleHp} / 100`);
    this.ammoText.setText(`탄약 ${this.ammo} / 3`);
    this.monsterText.setText(`× ${this.enemies.length + this.pendingSpawns}`);
    this.hpFill.displayWidth = 92 * this.castleHp / 100;
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT, backgroundColor: '#17294f', scene: BattleScene });
