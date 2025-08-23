import { Trip, Destination, ExportOptions } from '../types';
import { formatDate, formatTime } from '../utils';

export class ExportService {
  // GPX Export for GPS devices
  static exportToGPX(trip: Trip, destinations: Destination[]): string {
    const filteredDestinations = destinations.filter(dest => 
      trip.destinations.includes(dest.id) && dest.coordinates
    );

    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Vacation Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${this.escapeXML(trip.name)}</name>
    <desc>${this.escapeXML(trip.description || 'Exported from Vacation Planner')}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`;

    const waypoints = filteredDestinations.map(dest => `
  <wpt lat="${dest.coordinates!.lat}" lon="${dest.coordinates!.lng}">
    <name>${this.escapeXML(dest.name)}</name>
    <desc>${this.escapeXML(this.createWaypointDescription(dest))}</desc>
    <type>${dest.category}</type>
    <sym>Flag, Blue</sym>
  </wpt>`).join('');

    const track = this.createGPXTrack(trip, filteredDestinations);

    const gpxFooter = `
</gpx>`;

    return gpxHeader + waypoints + track + gpxFooter;
  }

  // CSV Export for spreadsheet applications
  static exportToCSV(trip: Trip, destinations: Destination[]): string {
    const filteredDestinations = destinations.filter(dest => 
      trip.destinations.includes(dest.id)
    );

    const headers = [
      'Name',
      'Ort',
      'Kategorie',
      'Status',
      'Priorität',
      'Startdatum',
      'Startzeit',
      'Enddatum',
      'Endzeit',
      'Dauer (min)',
      'Budget',
      'Tatsächliche Kosten',
      'Breitengrad',
      'Längengrad',
      'Tags',
      'Notizen'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredDestinations.map(dest => [
        this.escapeCSV(dest.name),
        this.escapeCSV(dest.location),
        this.escapeCSV(dest.category),
        this.escapeCSV(dest.status),
        dest.priority.toString(),
        dest.startDate,
        dest.startTime,
        dest.endDate,
        dest.endTime,
        dest.duration.toString(),
        dest.budget?.toString() || '',
        dest.actualCost?.toString() || '',
        dest.coordinates?.lat.toString() || '',
        dest.coordinates?.lng.toString() || '',
        this.escapeCSV(dest.tags.join('; ')),
        this.escapeCSV(dest.notes || '')
      ].join(','))
    ];

    return csvContent.join('\n');
  }

  // JSON Export with full data
  static exportToJSON(trip: Trip, destinations: Destination[], options: ExportOptions): string {
    const filteredDestinations = destinations.filter(dest => 
      trip.destinations.includes(dest.id)
    );

    const exportData = {
      trip: {
        id: trip.id,
        name: trip.name,
        description: trip.description,
        startDate: trip.startDate,
        endDate: trip.endDate,
        budget: trip.budget,
        actualCost: trip.actualCost,
        participants: trip.participants,
        status: trip.status,
        tags: trip.tags,
        exportedAt: new Date().toISOString()
      },
      destinations: filteredDestinations.map(dest => ({
        ...dest,
        photos: options.includePhotos ? dest.photos : [],
        notes: options.includeNotes ? dest.notes : undefined
      })),
      statistics: this.calculateTripStatistics(filteredDestinations)
    };

    return JSON.stringify(exportData, null, 2);
  }

  // KML Export for Google Earth
  static exportToKML(trip: Trip, destinations: Destination[]): string {
    const filteredDestinations = destinations.filter(dest => 
      trip.destinations.includes(dest.id) && dest.coordinates
    );

    const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXML(trip.name)}</name>
    <description>${this.escapeXML(trip.description || 'Exported from Vacation Planner')}</description>
    
    <Style id="destination-style">
      <IconStyle>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/pushpin/ylw-pushpin.png</href>
        </Icon>
      </IconStyle>
    </Style>`;

    const placemarks = filteredDestinations.map(dest => `
    <Placemark>
      <name>${this.escapeXML(dest.name)}</name>
      <description><![CDATA[${this.createKMLDescription(dest)}]]></description>
      <styleUrl>#destination-style</styleUrl>
      <Point>
        <coordinates>${dest.coordinates!.lng},${dest.coordinates!.lat},0</coordinates>
      </Point>
    </Placemark>`).join('');

    const kmlFooter = `
  </Document>
</kml>`;

    return kmlHeader + placemarks + kmlFooter;
  }

  // iCalendar Export for calendar applications
  static exportToICS(trip: Trip, destinations: Destination[]): string {
    const filteredDestinations = destinations.filter(dest => 
      trip.destinations.includes(dest.id)
    );

    const icsHeader = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Vacation Planner//Trip Export//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${trip.name}
X-WR-CALDESC:${trip.description || 'Exported from Vacation Planner'}`;

    const events = filteredDestinations.map(dest => {
      const startDateTime = this.formatICSDateTime(dest.startDate, dest.startTime);
      const endDateTime = this.formatICSDateTime(dest.endDate, dest.endTime);
      
      return `
BEGIN:VEVENT
UID:${dest.id}@vacation-planner.app
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${this.escapeICS(dest.name)}
DESCRIPTION:${this.escapeICS(this.createEventDescription(dest))}
LOCATION:${this.escapeICS(dest.location)}
CATEGORIES:${dest.category}
STATUS:${dest.status === 'planned' ? 'TENTATIVE' : dest.status === 'visited' ? 'CONFIRMED' : 'CANCELLED'}
PRIORITY:${10 - dest.priority}
CREATED:${new Date(dest.createdAt).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
LAST-MODIFIED:${new Date(dest.updatedAt).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
END:VEVENT`;
    }).join('');

    const icsFooter = `
END:VCALENDAR`;

    return icsHeader + events + icsFooter;
  }

  // Helper methods
  private static createWaypointDescription(dest: Destination): string {
    const parts = [
      `Kategorie: ${dest.category}`,
      `Status: ${dest.status}`,
      `Priorität: ${dest.priority}/5`,
      `Zeit: ${formatTime(dest.startTime)} - ${formatTime(dest.endTime)}`,
      `Dauer: ${Math.floor(dest.duration / 60)}h ${dest.duration % 60}min`
    ];

    if (dest.budget) {
      parts.push(`Budget: €${dest.budget}`);
    }

    if (dest.notes) {
      parts.push(`Notizen: ${dest.notes}`);
    }

    if (dest.tags.length > 0) {
      parts.push(`Tags: ${dest.tags.join(', ')}`);
    }

    return parts.join(' | ');
  }

  private static createGPXTrack(trip: Trip, destinations: Destination[]): string {
    if (destinations.length < 2) return '';

    const trackPoints = destinations
      .sort((a, b) => trip.destinations.indexOf(a.id) - trip.destinations.indexOf(b.id))
      .map(dest => `
    <trkpt lat="${dest.coordinates!.lat}" lon="${dest.coordinates!.lng}">
      <name>${this.escapeXML(dest.name)}</name>
      <time>${new Date(`${dest.startDate}T${dest.startTime}`).toISOString()}</time>
    </trkpt>`).join('');

    return `
  <trk>
    <name>${this.escapeXML(trip.name)} - Route</name>
    <desc>Reiseroute für ${this.escapeXML(trip.name)}</desc>
    <trkseg>${trackPoints}
    </trkseg>
  </trk>`;
  }

  private static createKMLDescription(dest: Destination): string {
    return `
      <h3>${dest.name}</h3>
      <p><strong>Ort:</strong> ${dest.location}</p>
      <p><strong>Kategorie:</strong> ${dest.category}</p>
      <p><strong>Status:</strong> ${dest.status}</p>
      <p><strong>Priorität:</strong> ${dest.priority}/5</p>
      <p><strong>Zeit:</strong> ${formatTime(dest.startTime)} - ${formatTime(dest.endTime)}</p>
      <p><strong>Datum:</strong> ${formatDate(dest.startDate)} - ${formatDate(dest.endDate)}</p>
      ${dest.budget ? `<p><strong>Budget:</strong> €${dest.budget}</p>` : ''}
      ${dest.notes ? `<p><strong>Notizen:</strong> ${dest.notes}</p>` : ''}
      ${dest.tags.length > 0 ? `<p><strong>Tags:</strong> ${dest.tags.join(', ')}</p>` : ''}
    `;
  }

  private static createEventDescription(dest: Destination): string {
    const parts = [
      `Ort: ${dest.location}`,
      `Kategorie: ${dest.category}`,
      `Status: ${dest.status}`,
      `Priorität: ${dest.priority}/5`,
      `Dauer: ${Math.floor(dest.duration / 60)}h ${dest.duration % 60}min`
    ];

    if (dest.budget) {
      parts.push(`Budget: €${dest.budget}`);
    }

    if (dest.notes) {
      parts.push(`\\n\\nNotizen:\\n${dest.notes}`);
    }

    if (dest.tags.length > 0) {
      parts.push(`\\n\\nTags: ${dest.tags.join(', ')}`);
    }

    return parts.join('\\n');
  }

  private static calculateTripStatistics(destinations: Destination[]) {
    return {
      totalDestinations: destinations.length,
      visitedDestinations: destinations.filter(d => d.status === 'visited').length,
      plannedDestinations: destinations.filter(d => d.status === 'planned').length,
      skippedDestinations: destinations.filter(d => d.status === 'skipped').length,
      totalBudget: destinations.reduce((sum, d) => sum + (d.budget || 0), 0),
      actualCost: destinations.reduce((sum, d) => sum + (d.actualCost || 0), 0),
      averagePriority: destinations.reduce((sum, d) => sum + d.priority, 0) / destinations.length,
      totalDuration: destinations.reduce((sum, d) => sum + d.duration, 0)
    };
  }

  private static formatICSDateTime(date: string, time: string): string {
    return new Date(`${date}T${time}`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  private static escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static escapeCSV(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  private static escapeICS(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  // Download helper
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}