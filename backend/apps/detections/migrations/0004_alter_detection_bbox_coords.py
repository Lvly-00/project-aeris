from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('detections', '0003_detection_reviewed_at_detection_reviewed_by_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='detection',
            name='bbox_coords',
            field=models.JSONField(blank=True, default=list, help_text='Bounding box coordinates [x1, y1, x2, y2]'),
        ),
    ]
