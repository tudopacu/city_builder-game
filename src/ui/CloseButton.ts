import Phaser from 'phaser';

export class CloseButton {
    constructor(
        private scene: Phaser.Scene,
        private x: number,
        private y: number,
        private onClick: () => void,
    ) {}

    public create(): Phaser.GameObjects.Text {
        return this.scene.add.text(this.x, this.y, '✕', {
            fontSize: '16px',
            color: '#ff6666',
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.onClick());
    }
}
