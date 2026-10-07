const WIDTH = 405;
const HEIGHT = 720;

class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle');
  }

  create() {
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
    this.input.on('pointerdown', pointer => this.manualAttack(pointer));
    this.time.addEvent({ delay: 1000, loop: true, callback: this.autoAttack, callbackScope: this });
    this.time.addEvent({ delay: 2400, loop: true, callback: this.rechargeAmmo, callbackScope: this });
    this.startWave();
  }

  drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x17294f, 0x17294f, 0x4e7ba1, 0x4e7ba1, 1);
    g.fillRect(0, 0, WIDTH, HEIGHT);
    g.fillStyle(0x2d694f, 1);
    g.fillRect(0, 494, WIDTH, 226);
    g.fillStyle(0x1f553f, 1);
    for (let x = 0; x < WIDTH; x += 30) g.fillTriangle(x, 494, x + 24, 494, x + 12, 467);
    g.fillStyle(0x6d4a32, 1);
    g.fillRect(0, 570, WIDTH, 64);
    g.lineStyle(2, 0x99704c, 0.55);
    for (let x = -30; x < WIDTH; x += 42) g.lineBetween(x, 634, x + 70, 570);
  }

  createHud() {
    this.add.rectangle(WIDTH / 2, 34, WIDTH - 24, 54, 0x0b1530, 0.86).setStrokeStyle(1, 0x8fa7cf);
    this.waveText = this.add.text(18, 17, '', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff' });
    this.goldText = this.add.text(WIDTH - 18, 17, '', { fontSize: '16px', fontStyle: 'bold', color: '#ffe27a' }).setOrigin(1, 0);
    this.ammoText = this.add.text(WIDTH / 2, 51, '', { fontSize: '14px', color: '#d7e5ff' }).setOrigin(0.5);
    this.hpBack = this.add.rectangle(80, 100, 130, 13, 0x301d28).setOrigin(0, 0.5);
    this.hpFill = this.add.rectangle(80, 100, 130, 13, 0x45d36f).setOrigin(0, 0.5);
    this.add.text(18, 88, '성 체력', { fontSize: '13px', color: '#ffffff' });
    this.message = this.add.text(WIDTH / 2, 145, '', { fontSize: '25px', fontStyle: 'bold', color: '#ffffff', stroke: '#17213d', strokeThickness: 6 }).setOrigin(0.5).setDepth(10);
    this.updateHud();
  }

  createCastleAndHero() {
    const castle = this.add.container(45, 430);
    const stone = this.add.graphics();
    stone.fillStyle(0xa9b4c4).fillRect(0, 42, 94, 110).fillTriangle(-5, 42, 47, -2, 99, 42);
    stone.fillStyle(0x56657d).fillRect(35, 105, 25, 47);
    stone.fillStyle(0x2d3e5a).fillRect(12, 57, 16, 23).fillRect(67, 57, 16, 23);
    castle.add(stone);
    this.add.text(92, 587, '성', { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    this.hero = this.add.container(150, 530);
    const body = this.add.graphics();
    body.fillStyle(0xf2c49c).fillCircle(0, -25, 14);
    body.fillStyle(0x5a80d5).fillTriangle(-21, 14, 0, -13, 21, 14).fillRect(-13, 10, 26, 18);
    body.lineStyle(5, 0xd9e8fc).lineBetween(14, -3, 40, -29);
    this.hero.add(body);
    this.add.text(150, 576, '영웅', { fontSize: '14px', color: '#dce9ff' }).setOrigin(0.5);
  }

  startWave() {
    if (!this.active) return;
    this.message.setText(`WAVE ${this.wave}`).setAlpha(1);
    this.tweens.add({ targets: this.message, alpha: 0, delay: 1100, duration: 500 });
    const count = 5 + this.wave * 2;
    this.pendingSpawns = count + (this.wave === 3 ? 1 : 0);
    for (let i = 0; i < count; i++) this.time.delayedCall(700 + i * 750, () => this.spawnEnemy(false));
    if (this.wave === 3) this.time.delayedCall(700 + count * 750, () => this.spawnEnemy(true));
  }

  spawnEnemy(isBoss) {
    this.pendingSpawns--;
    if (!this.active) return;
    const maxHp = isBoss ? 120 : 25 + this.wave * 9;
    const enemy = {
      isBoss, hp: maxHp, maxHp, speed: isBoss ? 11 : 17 + this.wave * 2,
      body: this.add.container(440, Phaser.Math.Between(280, 555))
    };
    const art = this.add.graphics();
    const color = isBoss ? 0xb54766 : 0x7e5cc2;
    const size = isBoss ? 27 : 17;
    art.fillStyle(color).fillCircle(0, 0, size).fillTriangle(-size, -size + 4, -size + 4, -size * 1.8).fillTriangle(size, -size + 4, size - 4, -size * 1.8);
    art.fillStyle(0xffffff).fillCircle(-size / 3, -2, 3).fillCircle(size / 3, -2, 3);
    enemy.body.add(art);
    enemy.bar = this.add.rectangle(enemy.body.x - size, enemy.body.y - size - 13, size * 2, 5, 0xe95868).setOrigin(0, 0.5);
    enemy.body.setData('enemy', enemy);
    this.enemies.push(enemy);
  }

  update(_, delta) {
    if (!this.active) return;
    this.enemies.slice().forEach(enemy => {
      enemy.body.x -= enemy.speed * delta / 1000;
      enemy.bar.x = enemy.body.x - (enemy.isBoss ? 27 : 17);
      enemy.bar.y = enemy.body.y - (enemy.isBoss ? 40 : 30);
      if (enemy.body.x < 128) this.hitCastle(enemy);
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
    this.fireProjectile(target, 27, 0xffd35c);
    this.updateHud();
  }

  fireProjectile(target, damage, color) {
    if (!this.enemies.includes(target)) return;
    const bolt = this.add.circle(this.hero.x + 24, this.hero.y - 23, 6, color).setDepth(5);
    this.tweens.add({ targets: bolt, x: target.body.x, y: target.body.y, duration: 210, onComplete: () => {
      bolt.destroy();
      this.damageEnemy(target, damage);
    }});
  }

  damageEnemy(enemy, damage) {
    if (!this.enemies.includes(enemy)) return;
    enemy.hp -= damage;
    this.tweens.add({ targets: enemy.body, x: enemy.body.x + 7, yoyo: true, duration: 45, repeat: 1 });
    if (enemy.hp <= 0) {
      this.gold += enemy.isBoss ? 50 : 8;
      enemy.body.destroy(); enemy.bar.destroy();
      this.enemies.splice(this.enemies.indexOf(enemy), 1);
      this.updateHud();
      this.checkWaveClear();
    } else {
      enemy.bar.displayWidth = (enemy.isBoss ? 54 : 34) * enemy.hp / enemy.maxHp;
    }
  }

  hitCastle(enemy) {
    this.castleHp = Math.max(0, this.castleHp - (enemy.isBoss ? 28 : 10));
    enemy.body.destroy(); enemy.bar.destroy();
    this.enemies.splice(this.enemies.indexOf(enemy), 1);
    this.updateHud();
    if (this.castleHp === 0) this.finish('게임 오버');
  }

  rechargeAmmo() {
    if (this.active && this.ammo < 3) { this.ammo++; this.updateHud(); }
  }

  checkWaveClear() {
    if (!this.enemies.length && this.pendingSpawns === 0) {
      if (this.wave === 3) this.finish('전투 승리!');
      else { this.wave++; this.time.delayedCall(1400, () => this.startWave()); }
    }
  }

  finish(text) {
    this.active = false;
    this.message.setText(text).setAlpha(1);
    this.add.text(WIDTH / 2, 182, text === '전투 승리!' ? '정비 씬은 다음 단계에서 연결됩니다.' : '새로고침하여 다시 도전하세요.', { fontSize: '14px', color: '#e6efff' }).setOrigin(0.5).setDepth(10);
  }

  updateHud() {
    this.waveText.setText(`WAVE ${this.wave} / 3`);
    this.goldText.setText(`✦ ${this.gold}`);
    this.ammoText.setText(`수동 공격  ${'●'.repeat(this.ammo)}${'○'.repeat(3 - this.ammo)}`);
    this.hpFill.displayWidth = 130 * this.castleHp / 100;
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: WIDTH, height: HEIGHT, backgroundColor: '#17294f', scene: BattleScene });
